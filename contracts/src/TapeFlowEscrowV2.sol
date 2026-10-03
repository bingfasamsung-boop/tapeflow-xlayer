// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TapeFlow Escrow V2
/// @notice Immutable X Layer escrow with a default TapeFlow arbiter, review windows,
/// encrypted wallet-inbox messages, optional TapeSend anchors and a dispute-only
/// arbiter work queue.
/// @dev Encrypted payloads are public ciphertext. Plaintext and private keys never
/// belong on this contract. Every participant derives their inbox key from a wallet
/// signature and receives the per-order key through an X25519 envelope.
contract TapeFlowEscrowV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);
    uint64 public constant MIN_DEADLINE = 2 minutes;
    uint64 public constant MAX_DEADLINE = 365 days;
    uint64 public constant MIN_REVIEW_PERIOD = 30 minutes;
    uint64 public constant MAX_REVIEW_PERIOD = 30 days;
    uint64 public constant TAPEFLOW_INTERVENTION_DELAY = 15 days;
    uint256 public constant MAX_ENCRYPTED_MESSAGE_BYTES = 4_096;
    uint256 public constant MAX_CASE_KEY_ENVELOPE_BYTES = 192;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SERVICE_FEE_BPS = 100; // 1%

    enum EscrowStatus { None, Funded, Delivered, Released, Refunded, Disputed, Resolved }
    enum MessageKind { Chat, Evidence, DeliveryProof, DisputeStatement, Resolution }

    struct Escrow {
        address payer;
        address payee;
        address arbiter;
        address token;
        uint128 amount;
        uint128 serviceFee;
        uint128 arbiterReward;
        uint64 deliveryDeadline;
        uint64 reviewPeriod;
        uint64 createdAt;
        uint64 deliveredAt;
        uint64 disputedAt;
        uint64 closedAt;
        EscrowStatus status;
        bytes32 metadataHash;
        bytes32 payerEndpoint;
        bytes32 payeeEndpoint;
        bytes32 arbiterEndpoint;
        bytes32 caseId;
    }

    struct MessageAnchor {
        address sender;
        MessageKind kind;
        bytes32 tapeSendRef;
        bytes32 contentHash;
        uint64 timestamp;
    }

    struct EncryptedMessage {
        address sender;
        MessageKind kind;
        bytes32 tapeSendRef;
        bytes32 ciphertextHash;
        uint64 timestamp;
        bytes ciphertext;
    }

    address public immutable defaultArbiter;
    bytes32 public immutable defaultArbiterEndpoint;
    address public immutable FEE_RECIPIENT;
    uint256 public nextEscrowId = 1;

    mapping(uint256 => Escrow) public escrows;
    mapping(address => uint256[]) private _payerEscrows;
    mapping(address => uint256[]) private _payeeEscrows;
    mapping(address => uint256[]) private _arbiterDisputes;
    uint256[] private _allDisputes;
    mapping(uint256 => MessageAnchor[]) private _messageAnchors;
    mapping(address => bytes32) public inboxPublicKey;
    mapping(uint256 => mapping(address => bytes)) private _caseKeyEnvelopes;
    mapping(uint256 => EncryptedMessage[]) private _encryptedMessages;
    mapping(uint256 => mapping(address => bool)) public fallbackApproval;
    mapping(uint256 => bool) public tapeFlowIntervened;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint256 serviceFee,
        uint256 arbiterReward,
        uint64 deliveryDeadline,
        uint64 reviewPeriod,
        address arbiter,
        bytes32 payerEndpoint,
        bytes32 payeeEndpoint,
        bytes32 arbiterEndpoint,
        bytes32 caseId,
        bytes32 metadataHash
    );
    event InboxKeyRegistered(address indexed wallet, bytes32 publicKey);
    event CaseKeyGranted(uint256 indexed escrowId, address indexed grantee, address indexed grantedBy, bytes envelope);
    event EncryptedMessagePosted(
        uint256 indexed escrowId,
        address indexed sender,
        MessageKind kind,
        bytes32 indexed tapeSendRef,
        bytes32 ciphertextHash,
        uint64 timestamp
    );
    event EscrowStatusChanged(uint256 indexed escrowId, EscrowStatus status, address indexed actor, uint64 timestamp);
    event EscrowMessageAnchored(
        uint256 indexed escrowId,
        address indexed sender,
        MessageKind kind,
        bytes32 indexed tapeSendRef,
        bytes32 contentHash,
        uint64 timestamp
    );
    event EscrowResolved(
        uint256 indexed escrowId,
        address indexed arbiter,
        uint256 payerAmount,
        uint256 payeeAmount,
        bytes32 reasonHash
    );
    event TapeFlowArbiterRequested(uint256 indexed escrowId, address indexed party, bool payerApproved, bool payeeApproved);
    event ArbiterChanged(uint256 indexed escrowId, address indexed previousArbiter, address indexed newArbiter, bytes32 newEndpoint);
    event TapeFlowInterventionActivated(uint256 indexed escrowId, address indexed appointedArbiter, address indexed tapeFlowArbiter);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidState();
    error InvalidReference();
    error NotAuthorized();
    error NotExpired();
    error TooEarly();
    error UnsupportedTokenBehavior();
    error TransferFailed();
    error PayloadTooLarge();

    constructor(address defaultArbiter_, bytes32 defaultArbiterEndpoint_, address feeRecipient_) {
        if (defaultArbiter_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        defaultArbiter = defaultArbiter_;
        defaultArbiterEndpoint = defaultArbiterEndpoint_;
        FEE_RECIPIENT = feeRecipient_;
    }

    function createEscrow(
        address token,
        address payee,
        address arbiter,
        uint128 amount,
        uint128 arbiterReward,
        uint64 deliveryDeadline,
        uint64 reviewPeriod,
        bytes32 metadataHash,
        bytes32 payerEndpoint,
        bytes32 payeeEndpoint,
        bytes32 arbiterEndpoint,
        bytes32 caseId,
        bytes calldata payerKeyEnvelope,
        bytes calldata payeeKeyEnvelope
    ) external payable nonReentrant returns (uint256 id) {
        if (payee == address(0) || payee == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _validateDeadline(deliveryDeadline);
        if (reviewPeriod < MIN_REVIEW_PERIOD || reviewPeriod > MAX_REVIEW_PERIOD) revert InvalidDeadline();

        address selectedArbiter = arbiter == address(0) ? defaultArbiter : arbiter;
        bytes32 selectedEndpoint = selectedArbiter == defaultArbiter ? defaultArbiterEndpoint : arbiterEndpoint;
        if (selectedArbiter == msg.sender || selectedArbiter == payee) revert InvalidAddress();
        if (caseId == bytes32(0)) revert InvalidReference();
        if (inboxPublicKey[msg.sender] == bytes32(0) || inboxPublicKey[payee] == bytes32(0)) revert InvalidReference();
        _validateEnvelope(payerKeyEnvelope);
        _validateEnvelope(payeeKeyEnvelope);

        uint256 serviceFee = quoteServiceFee(amount);
        uint256 totalFunding = uint256(amount) + serviceFee + arbiterReward;
        if (serviceFee > type(uint128).max) revert InvalidAmount();
        _collect(token, totalFunding);
        id = nextEscrowId++;
        escrows[id] = Escrow({
            payer: msg.sender,
            payee: payee,
            arbiter: selectedArbiter,
            token: token,
            amount: amount,
            serviceFee: uint128(serviceFee),
            arbiterReward: arbiterReward,
            deliveryDeadline: deliveryDeadline,
            reviewPeriod: reviewPeriod,
            createdAt: uint64(block.timestamp),
            deliveredAt: 0,
            disputedAt: 0,
            closedAt: 0,
            status: EscrowStatus.Funded,
            metadataHash: metadataHash,
            payerEndpoint: payerEndpoint,
            payeeEndpoint: payeeEndpoint,
            arbiterEndpoint: selectedEndpoint,
            caseId: caseId
        });
        _caseKeyEnvelopes[id][msg.sender] = payerKeyEnvelope;
        _caseKeyEnvelopes[id][payee] = payeeKeyEnvelope;
        _payerEscrows[msg.sender].push(id);
        _payeeEscrows[payee].push(id);
        emit EscrowCreated(
            id,
            msg.sender,
            payee,
            token,
            amount,
            serviceFee,
            arbiterReward,
            deliveryDeadline,
            reviewPeriod,
            selectedArbiter,
            payerEndpoint,
            payeeEndpoint,
            selectedEndpoint,
            caseId,
            metadataHash
        );
        emit CaseKeyGranted(id, msg.sender, msg.sender, payerKeyEnvelope);
        emit CaseKeyGranted(id, payee, msg.sender, payeeKeyEnvelope);
        emit EscrowStatusChanged(id, EscrowStatus.Funded, msg.sender, uint64(block.timestamp));
    }

    /// @notice Registers the caller's deterministic X25519 inbox public key.
    /// The corresponding secret is derived locally from a wallet signature and
    /// must never be submitted to this contract.
    function registerInboxKey(bytes32 publicKey) external {
        if (publicKey == bytes32(0)) revert InvalidReference();
        bytes32 current = inboxPublicKey[msg.sender];
        if (current != bytes32(0) && current != publicKey) revert InvalidState();
        inboxPublicKey[msg.sender] = publicKey;
        emit InboxKeyRegistered(msg.sender, publicKey);
    }

    /// @notice Adds an encrypted copy of the per-order key for an authorized reader.
    /// A party grants the arbiter only after a dispute, so pre-dispute history stays
    /// inaccessible to the arbiter until the dispute transition.
    function grantCaseKey(uint256 escrowId, address grantee, bytes calldata envelope) external {
        Escrow storage e = _escrow(escrowId);
        if (e.status == EscrowStatus.Released || e.status == EscrowStatus.Refunded || e.status == EscrowStatus.Resolved) revert InvalidState();
        if (msg.sender != e.payer && msg.sender != e.payee) revert NotAuthorized();
        bool party = grantee == e.payer || grantee == e.payee;
        bool appointed = e.status == EscrowStatus.Disputed && grantee == e.arbiter;
        bool tapeFlowParallel = e.status == EscrowStatus.Disputed && tapeFlowIntervened[escrowId] && grantee == defaultArbiter;
        if (!party && !appointed && !tapeFlowParallel) revert NotAuthorized();
        if (inboxPublicKey[grantee] == bytes32(0)) revert InvalidReference();
        if (_caseKeyEnvelopes[escrowId][grantee].length != 0) revert InvalidState();
        _validateEnvelope(envelope);
        _caseKeyEnvelopes[escrowId][grantee] = envelope;
        emit CaseKeyGranted(escrowId, grantee, msg.sender, envelope);
    }

    /// @notice Stores authenticated ciphertext so wallet-only participants can
    /// communicate without owning a TapeOut container. tapeSendRef may be zero;
    /// when present it proves an optional native TapeSend copy was also sent.
    function postEncryptedMessage(
        uint256 escrowId,
        MessageKind kind,
        bytes calldata ciphertext,
        bytes32 tapeSendRef
    ) external {
        Escrow storage e = _escrow(escrowId);
        _authorizeMessageSender(escrowId, e);
        if (kind == MessageKind.Resolution) revert InvalidState();
        if (ciphertext.length == 0) revert InvalidReference();
        if (ciphertext.length > MAX_ENCRYPTED_MESSAGE_BYTES) revert PayloadTooLarge();
        if (e.status == EscrowStatus.Released || e.status == EscrowStatus.Refunded || e.status == EscrowStatus.Resolved) revert InvalidState();
        bytes32 digest = keccak256(ciphertext);
        _encryptedMessages[escrowId].push(EncryptedMessage({
            sender: msg.sender,
            kind: kind,
            tapeSendRef: tapeSendRef,
            ciphertextHash: digest,
            timestamp: uint64(block.timestamp),
            ciphertext: ciphertext
        }));
        emit EncryptedMessagePosted(escrowId, msg.sender, kind, tapeSendRef, digest, uint64(block.timestamp));
    }

    function markDelivered(uint256 escrowId, bytes32 tapeSendRef, bytes32 proofHash) external {
        Escrow storage e = _escrow(escrowId);
        if (msg.sender != e.payee) revert NotAuthorized();
        if (e.status != EscrowStatus.Funded) revert InvalidState();
        e.status = EscrowStatus.Delivered;
        e.deliveredAt = uint64(block.timestamp);
        if (tapeSendRef != bytes32(0) || proofHash != bytes32(0)) {
            _anchor(escrowId, e, MessageKind.DeliveryProof, tapeSendRef, proofHash);
        }
        emit EscrowStatusChanged(escrowId, e.status, msg.sender, uint64(block.timestamp));
    }

    function releaseEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrow(escrowId);
        if (msg.sender != e.payer) revert NotAuthorized();
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.Delivered) revert InvalidState();
        _closeRelease(escrowId, e);
    }

    function finalizeAfterReview(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrow(escrowId);
        if (e.status != EscrowStatus.Delivered) revert InvalidState();
        if (block.timestamp < uint256(e.deliveredAt) + e.reviewPeriod) revert TooEarly();
        _closeRelease(escrowId, e);
    }

    function refundUndelivered(uint256 escrowId) external nonReentrant {
        Escrow storage e = _escrow(escrowId);
        if (msg.sender != e.payer) revert NotAuthorized();
        if (e.status != EscrowStatus.Funded) revert InvalidState();
        if (block.timestamp <= e.deliveryDeadline) revert NotExpired();
        _closeRefund(escrowId, e);
    }

    function openDispute(uint256 escrowId, bytes32 tapeSendRef, bytes32 evidenceHash) external {
        Escrow storage e = _escrow(escrowId);
        if (msg.sender != e.payer && msg.sender != e.payee) revert NotAuthorized();
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.Delivered) revert InvalidState();
        e.status = EscrowStatus.Disputed;
        e.disputedAt = uint64(block.timestamp);
        _arbiterDisputes[e.arbiter].push(escrowId);
        _allDisputes.push(escrowId);
        if (tapeSendRef != bytes32(0) || evidenceHash != bytes32(0)) {
            _anchor(escrowId, e, MessageKind.DisputeStatement, tapeSendRef, evidenceHash);
        }
        emit EscrowStatusChanged(escrowId, e.status, msg.sender, uint64(block.timestamp));
    }

    function anchorMessage(
        uint256 escrowId,
        MessageKind kind,
        bytes32 tapeSendRef,
        bytes32 contentHash
    ) external {
        Escrow storage e = _escrow(escrowId);
        _authorizeMessageSender(escrowId, e);
        if (kind == MessageKind.Resolution) revert InvalidState();
        _anchor(escrowId, e, kind, tapeSendRef, contentHash);
    }

    /// @notice If the appointed arbiter cannot serve, both payer and payee must
    /// independently approve switching the live dispute to TapeFlow arbitration.
    function approveTapeFlowFallback(uint256 escrowId) external {
        Escrow storage e = _escrow(escrowId);
        if (e.status != EscrowStatus.Disputed) revert InvalidState();
        if (e.arbiter == defaultArbiter) revert InvalidState();
        if (msg.sender != e.payer && msg.sender != e.payee) revert NotAuthorized();
        fallbackApproval[escrowId][msg.sender] = true;
        bool payerApproved = fallbackApproval[escrowId][e.payer];
        bool payeeApproved = fallbackApproval[escrowId][e.payee];
        emit TapeFlowArbiterRequested(escrowId, msg.sender, payerApproved, payeeApproved);
        if (payerApproved && payeeApproved) {
            _switchToTapeFlow(escrowId, e);
        }
    }

    /// @notice TapeFlow may join a dispute that the appointed arbiter has left
    /// unresolved for at least fifteen days. The appointed arbiter keeps its
    /// authority; whichever authorized arbiter resolves first closes the case.
    function activateTapeFlowIntervention(uint256 escrowId) external {
        Escrow storage e = _escrow(escrowId);
        if (msg.sender != defaultArbiter) revert NotAuthorized();
        if (e.status != EscrowStatus.Disputed || e.arbiter == defaultArbiter || tapeFlowIntervened[escrowId]) revert InvalidState();
        if (block.timestamp < uint256(e.disputedAt) + TAPEFLOW_INTERVENTION_DELAY) revert TooEarly();
        tapeFlowIntervened[escrowId] = true;
        _arbiterDisputes[defaultArbiter].push(escrowId);
        emit TapeFlowInterventionActivated(escrowId, e.arbiter, defaultArbiter);
    }

    function resolveEscrow(
        uint256 escrowId,
        uint128 payerAmount,
        uint128 payeeAmount,
        bytes32 reasonHash
    ) external nonReentrant {
        Escrow storage e = _escrow(escrowId);
        if (e.status != EscrowStatus.Disputed) revert InvalidState();
        bool appointed = msg.sender == e.arbiter;
        bool tapeFlowParallel = tapeFlowIntervened[escrowId] && msg.sender == defaultArbiter;
        if (!appointed && !tapeFlowParallel) revert NotAuthorized();
        if (uint256(payerAmount) + payeeAmount != e.amount) revert InvalidAmount();
        if (reasonHash == bytes32(0)) revert InvalidReference();

        e.status = EscrowStatus.Resolved;
        e.closedAt = uint64(block.timestamp);
        if (payerAmount != 0) _sendAsset(e.token, e.payer, payerAmount);
        if (payeeAmount != 0) _sendAsset(e.token, e.payee, payeeAmount);
        _sendAsset(e.token, FEE_RECIPIENT, e.serviceFee);
        if (e.arbiterReward != 0) _sendAsset(e.token, msg.sender, e.arbiterReward);
        emit EscrowResolved(escrowId, msg.sender, payerAmount, payeeAmount, reasonHash);
        emit EscrowStatusChanged(escrowId, e.status, msg.sender, uint64(block.timestamp));
    }

    function payerEscrowCount(address payer) external view returns (uint256) {
        return _payerEscrows[payer].length;
    }

    function payerEscrowAt(address payer, uint256 index) external view returns (uint256) {
        return _payerEscrows[payer][index];
    }

    function payeeEscrowCount(address payee) external view returns (uint256) {
        return _payeeEscrows[payee].length;
    }

    function payeeEscrowAt(address payee, uint256 index) external view returns (uint256) {
        return _payeeEscrows[payee][index];
    }

    /// @notice The arbiter work queue is populated only when an escrow is disputed.
    function arbiterDisputeCount(address arbiter) external view returns (uint256) {
        return _arbiterDisputes[arbiter].length;
    }

    function arbiterDisputeAt(address arbiter, uint256 index) external view returns (uint256) {
        return _arbiterDisputes[arbiter][index];
    }

    function disputeCount() external view returns (uint256) {
        return _allDisputes.length;
    }

    function disputeAt(uint256 index) external view returns (uint256) {
        return _allDisputes[index];
    }

    function messageCount(uint256 escrowId) external view returns (uint256) {
        return _messageAnchors[escrowId].length;
    }

    function messageAt(uint256 escrowId, uint256 index) external view returns (MessageAnchor memory) {
        return _messageAnchors[escrowId][index];
    }

    function caseKeyEnvelope(uint256 escrowId, address reader) external view returns (bytes memory) {
        Escrow storage e = _escrow(escrowId);
        if (!_isCaseReader(escrowId, e, msg.sender) || reader != msg.sender) revert NotAuthorized();
        return _caseKeyEnvelopes[escrowId][reader];
    }

    function hasCaseKeyEnvelope(uint256 escrowId, address reader) external view returns (bool) {
        _escrow(escrowId);
        return _caseKeyEnvelopes[escrowId][reader].length != 0;
    }

    function encryptedMessageCount(uint256 escrowId) external view returns (uint256) {
        Escrow storage e = _escrow(escrowId);
        if (!_isCaseReader(escrowId, e, msg.sender)) revert NotAuthorized();
        return _encryptedMessages[escrowId].length;
    }

    function encryptedMessageAt(uint256 escrowId, uint256 index) external view returns (EncryptedMessage memory) {
        Escrow storage e = _escrow(escrowId);
        if (!_isCaseReader(escrowId, e, msg.sender)) revert NotAuthorized();
        return _encryptedMessages[escrowId][index];
    }

    function reviewDeadline(uint256 escrowId) external view returns (uint256) {
        Escrow storage e = _escrow(escrowId);
        return e.deliveredAt == 0 ? 0 : uint256(e.deliveredAt) + e.reviewPeriod;
    }

    function _escrow(uint256 escrowId) private view returns (Escrow storage e) {
        e = escrows[escrowId];
        if (e.payer == address(0)) revert InvalidAddress();
    }

    function _anchor(
        uint256 escrowId,
        Escrow storage e,
        MessageKind kind,
        bytes32 tapeSendRef,
        bytes32 contentHash
    ) private {
        if (e.status == EscrowStatus.Released || e.status == EscrowStatus.Refunded || e.status == EscrowStatus.Resolved) revert InvalidState();
        if (tapeSendRef == bytes32(0) || contentHash == bytes32(0)) revert InvalidReference();
        _messageAnchors[escrowId].push(MessageAnchor(msg.sender, kind, tapeSendRef, contentHash, uint64(block.timestamp)));
        emit EscrowMessageAnchored(escrowId, msg.sender, kind, tapeSendRef, contentHash, uint64(block.timestamp));
    }

    function _authorizeMessageSender(uint256 escrowId, Escrow storage e) private view {
        if (msg.sender == e.payer || msg.sender == e.payee) return;
        bool appointed = msg.sender == e.arbiter;
        bool tapeFlowParallel = tapeFlowIntervened[escrowId] && msg.sender == defaultArbiter;
        if (e.status != EscrowStatus.Disputed || (!appointed && !tapeFlowParallel)) revert NotAuthorized();
    }

    function _isCaseReader(uint256 escrowId, Escrow storage e, address reader) private view returns (bool) {
        if (reader == e.payer || reader == e.payee) return true;
        if (e.status != EscrowStatus.Disputed) return false;
        if (reader == e.arbiter) return true;
        return tapeFlowIntervened[escrowId] && reader == defaultArbiter;
    }

    function _validateEnvelope(bytes calldata envelope) private pure {
        if (envelope.length == 0) revert InvalidReference();
        if (envelope.length > MAX_CASE_KEY_ENVELOPE_BYTES) revert PayloadTooLarge();
    }

    function _switchToTapeFlow(uint256 escrowId, Escrow storage e) private {
        address previous = e.arbiter;
        e.arbiter = defaultArbiter;
        e.arbiterEndpoint = defaultArbiterEndpoint;
        _arbiterDisputes[defaultArbiter].push(escrowId);
        emit ArbiterChanged(escrowId, previous, defaultArbiter, defaultArbiterEndpoint);
    }

    function quoteServiceFee(uint256 amount) public pure returns (uint256) {
        if (amount == 0) return 0;
        return (amount * SERVICE_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
    }

    function _closeRelease(uint256 escrowId, Escrow storage e) private {
        e.status = EscrowStatus.Released;
        e.closedAt = uint64(block.timestamp);
        _sendAsset(e.token, e.payee, e.amount);
        _sendAsset(e.token, FEE_RECIPIENT, e.serviceFee);
        if (e.arbiterReward != 0) _sendAsset(e.token, e.payer, e.arbiterReward);
        emit EscrowStatusChanged(escrowId, EscrowStatus.Released, msg.sender, uint64(block.timestamp));
    }

    function _closeRefund(uint256 escrowId, Escrow storage e) private {
        e.status = EscrowStatus.Refunded;
        e.closedAt = uint64(block.timestamp);
        _sendAsset(e.token, e.payer, uint256(e.amount) + e.serviceFee + e.arbiterReward);
        emit EscrowStatusChanged(escrowId, EscrowStatus.Refunded, msg.sender, uint64(block.timestamp));
    }

    function _collect(address token, uint256 amount) private {
        if (token == NATIVE) {
            if (msg.value != amount) revert InvalidAmount();
            return;
        }
        if (msg.value != 0) revert InvalidAmount();
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedTokenBehavior();
    }

    function _sendAsset(address token, address recipient, uint256 amount) private {
        if (token == NATIVE) {
            (bool ok,) = payable(recipient).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    function _validateDeadline(uint64 deadline) private view {
        if (deadline < block.timestamp + MIN_DEADLINE || deadline > block.timestamp + MAX_DEADLINE) revert InvalidDeadline();
    }
}
