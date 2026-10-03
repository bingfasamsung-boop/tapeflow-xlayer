// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITapeFlowPolicy {
    function validate(
        address payer,
        address token,
        address recipient,
        uint256 amount,
        bytes32 referenceId,
        bytes calldata policyData
    ) external returns (bool);
}

/// @title TapeFlow X Hub V1
/// @notice Ownerless X Layer payment primitives for direct payments, red packets, escrow,
/// delayed payments and stealth-address announcements. Native OKB is address(0).
/// @dev V1 is intentionally immutable. A later version is a new deployment, not an upgrade.
contract TapeFlowXHubV1 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);
    uint32 public constant MAX_PACKET_CLAIMS = 500;
    uint64 public constant MIN_DEADLINE = 2 minutes;
    uint64 public constant MAX_DEADLINE = 365 days;
    uint256 public constant MAX_METADATA_BYTES = 256;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant PRIVACY_SERVICE_FEE_BPS = 100; // 1%
    address public immutable FEE_RECIPIENT;

    enum PacketKind { Equal, Directed, Lucky, Password }
    enum EscrowStatus { None, Funded, Delivered, Released, Refunded, Disputed, Resolved }

    struct Packet {
        address creator;
        address token;
        address directedTo;
        uint128 remaining;
        uint96 amountPerClaim;
        uint64 deadline;
        uint64 createdBlock;
        uint32 maxClaims;
        uint32 claimCount;
        PacketKind kind;
        bytes32 secretHash;
        bytes32 randomSeed;
        bytes32 passwordSalt;
        bytes32 metadataHash;
    }

    struct Escrow {
        address payer;
        address payee;
        address arbiter;
        address token;
        uint128 amount;
        uint64 deadline;
        EscrowStatus status;
        bytes32 metadataHash;
    }

    struct ScheduledPayment {
        address payer;
        address payee;
        address token;
        uint128 amount;
        uint64 releaseTime;
        bool cancelable;
        bool claimed;
        bool cancelled;
        bytes32 metadataHash;
    }

    uint256 public nextPacketId = 1;
    uint256 public nextEscrowId = 1;
    uint256 public nextScheduleId = 1;

    mapping(uint256 => Packet) public packets;
    mapping(uint256 => mapping(address => bool)) public claimedAddress;
    mapping(uint256 => mapping(address => bytes32)) public passwordCommitment;
    mapping(uint256 => mapping(address => uint64)) public passwordCommitBlock;
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => ScheduledPayment) public schedules;

    event Payment(
        address indexed payer,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        bytes32 referenceId,
        address policy
    );
    event StealthPayment(
        uint256 indexed schemeId,
        address indexed payer,
        address indexed stealthAddress,
        address token,
        uint256 amount,
        uint256 serviceFee,
        bytes ephemeralPubKey,
        bytes metadata
    );
    event PacketCreated(
        uint256 indexed packetId,
        address indexed creator,
        address indexed token,
        PacketKind kind,
        uint256 total,
        uint32 maxClaims,
        uint64 deadline,
        bytes32 metadataHash
    );
    event LuckyRevealed(uint256 indexed packetId, bytes32 seed);
    event PasswordCommitted(uint256 indexed packetId, address indexed claimant, bytes32 commitment);
    event PacketClaimed(uint256 indexed packetId, address indexed claimant, uint256 amount);
    event PacketRefunded(uint256 indexed packetId, address indexed creator, uint256 amount);
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint64 deadline,
        address arbiter,
        bytes32 metadataHash
    );
    event EscrowStatusChanged(uint256 indexed escrowId, EscrowStatus status);
    event EscrowResolved(uint256 indexed escrowId, uint256 payerAmount, uint256 payeeAmount);
    event Scheduled(
        uint256 indexed scheduleId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint64 releaseTime,
        bool cancelable,
        bytes32 metadataHash
    );
    event ScheduleClaimed(uint256 indexed scheduleId, address indexed payee, uint256 amount);
    event ScheduleCancelled(uint256 indexed scheduleId, address indexed payer, uint256 amount);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidCount();
    error InvalidDeadline();
    error InvalidSecret();
    error InvalidCommitment();
    error InvalidState();
    error InvalidPolicy();
    error NotAuthorized();
    error WrongKind();
    error Expired();
    error NotExpired();
    error AlreadyClaimed();
    error FullyClaimed();
    error UnsupportedTokenBehavior();
    error TooEarly();
    error RevealWindowClosed();
    error NotRevealed();
    error TransferFailed();
    error MetadataTooLarge();

    constructor(address feeRecipient_) {
        if (feeRecipient_ == address(0)) revert InvalidAddress();
        FEE_RECIPIENT = feeRecipient_;
    }

    function payNative(
        address payable recipient,
        bytes32 referenceId,
        address policy,
        bytes calldata policyData
    ) external payable nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();
        _validatePolicy(policy, recipient, NATIVE, msg.value, referenceId, policyData);
        _sendAsset(NATIVE, recipient, msg.value);
        emit Payment(msg.sender, recipient, NATIVE, msg.value, referenceId, policy);
    }

    function payToken(
        address token,
        address recipient,
        uint256 amount,
        bytes32 referenceId,
        address policy,
        bytes calldata policyData
    ) external nonReentrant {
        if (token == address(0) || recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _validatePolicy(policy, recipient, token, amount, referenceId, policyData);
        _pullExact(token, msg.sender, recipient, amount);
        emit Payment(msg.sender, recipient, token, amount, referenceId, policy);
    }

    function payStealthNative(
        uint256 schemeId,
        address payable stealthAddress,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external payable nonReentrant {
        _validateStealth(stealthAddress, ephemeralPubKey, metadata);
        if (amount == 0) revert InvalidAmount();
        uint256 serviceFee = quotePrivacyServiceFee(amount);
        if (msg.value != amount + serviceFee) revert InvalidAmount();
        _sendAsset(NATIVE, stealthAddress, amount);
        _sendAsset(NATIVE, FEE_RECIPIENT, serviceFee);
        emit StealthPayment(schemeId, msg.sender, stealthAddress, NATIVE, amount, serviceFee, ephemeralPubKey, metadata);
    }

    function payStealthToken(
        uint256 schemeId,
        address token,
        address stealthAddress,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external nonReentrant {
        if (token == address(0)) revert InvalidAddress();
        _validateStealth(stealthAddress, ephemeralPubKey, metadata);
        if (amount == 0) revert InvalidAmount();
        uint256 serviceFee = quotePrivacyServiceFee(amount);
        _collect(token, amount + serviceFee);
        _sendAsset(token, stealthAddress, amount);
        _sendAsset(token, FEE_RECIPIENT, serviceFee);
        emit StealthPayment(schemeId, msg.sender, stealthAddress, token, amount, serviceFee, ephemeralPubKey, metadata);
    }

    function quotePrivacyServiceFee(uint256 amount) public pure returns (uint256) {
        if (amount == 0) return 0;
        return (amount * PRIVACY_SERVICE_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
    }

    function createEqualPacket(
        address token,
        uint96 amountPerClaim,
        uint32 maxClaims,
        uint64 deadline,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (amountPerClaim == 0) revert InvalidAmount();
        _validateCount(maxClaims);
        _validateDeadline(deadline);
        uint256 total = uint256(amountPerClaim) * maxClaims;
        id = _storePacket(token, address(0), total, amountPerClaim, maxClaims, deadline, PacketKind.Equal, bytes32(0), bytes32(0), metadataHash);
    }

    function createDirectedPacket(
        address token,
        address recipient,
        uint128 total,
        uint64 deadline,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (recipient == address(0)) revert InvalidAddress();
        if (total == 0) revert InvalidAmount();
        _validateDeadline(deadline);
        id = _storePacket(token, recipient, total, 0, 1, deadline, PacketKind.Directed, bytes32(0), bytes32(0), metadataHash);
    }

    function createLuckyPacket(
        address token,
        uint128 total,
        uint32 maxClaims,
        uint64 deadline,
        bytes32 seedCommitment,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (total == 0 || seedCommitment == bytes32(0)) revert InvalidAmount();
        _validateCount(maxClaims);
        _validateDeadline(deadline);
        id = _storePacket(token, address(0), total, 0, maxClaims, deadline, PacketKind.Lucky, seedCommitment, bytes32(0), metadataHash);
    }

    function revealLucky(uint256 packetId, bytes32 secret) external {
        Packet storage p = packets[packetId];
        if (p.creator == address(0)) revert InvalidAddress();
        if (p.kind != PacketKind.Lucky) revert WrongKind();
        if (msg.sender != p.creator) revert NotAuthorized();
        if (p.randomSeed != bytes32(0)) revert InvalidState();
        if (keccak256(abi.encodePacked(secret)) != p.secretHash) revert InvalidSecret();
        uint256 entropyBlock = uint256(p.createdBlock) + 1;
        if (block.number <= entropyBlock) revert TooEarly();
        if (block.number > entropyBlock + 256) revert RevealWindowClosed();
        p.randomSeed = keccak256(abi.encode(secret, blockhash(entropyBlock), packetId, address(this)));
        emit LuckyRevealed(packetId, p.randomSeed);
    }

    function createPasswordPacket(
        address token,
        bytes32 passwordHash,
        bytes32 passwordSalt,
        uint96 amountPerClaim,
        uint32 maxClaims,
        uint64 deadline,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (passwordHash == bytes32(0) || passwordSalt == bytes32(0)) revert InvalidSecret();
        if (amountPerClaim == 0) revert InvalidAmount();
        _validateCount(maxClaims);
        _validateDeadline(deadline);
        uint256 total = uint256(amountPerClaim) * maxClaims;
        id = _storePacket(token, address(0), total, amountPerClaim, maxClaims, deadline, PacketKind.Password, passwordHash, passwordSalt, metadataHash);
    }

    function claimEqual(uint256 packetId) external nonReentrant {
        Packet storage p = _claimable(packetId, PacketKind.Equal);
        if (claimedAddress[packetId][msg.sender]) revert AlreadyClaimed();
        claimedAddress[packetId][msg.sender] = true;
        _completeClaim(packetId, p, msg.sender, p.amountPerClaim);
    }

    function claimDirected(uint256 packetId) external nonReentrant {
        Packet storage p = _claimable(packetId, PacketKind.Directed);
        if (msg.sender != p.directedTo) revert NotAuthorized();
        if (p.claimCount != 0) revert AlreadyClaimed();
        _completeClaim(packetId, p, msg.sender, p.remaining);
    }

    function claimLucky(uint256 packetId) external nonReentrant {
        Packet storage p = _claimable(packetId, PacketKind.Lucky);
        if (p.randomSeed == bytes32(0)) revert NotRevealed();
        if (claimedAddress[packetId][msg.sender]) revert AlreadyClaimed();
        claimedAddress[packetId][msg.sender] = true;
        uint256 slotsLeft = uint256(p.maxClaims) - p.claimCount;
        uint256 value = p.remaining;
        if (slotsLeft > 1) {
            uint256 minimum = value / (slotsLeft * 2);
            if (minimum == 0) minimum = 1;
            uint256 hardMaximum = value - minimum * (slotsLeft - 1);
            uint256 softMaximum = value * 3 / (slotsLeft * 2);
            uint256 maximum = softMaximum < hardMaximum ? softMaximum : hardMaximum;
            if (maximum < minimum) maximum = minimum;
            value = minimum + uint256(keccak256(abi.encode(p.randomSeed, packetId, msg.sender, p.claimCount))) % (maximum - minimum + 1);
        }
        _completeClaim(packetId, p, msg.sender, value);
    }

    function commitPassword(uint256 packetId, bytes32 commitment) external {
        Packet storage p = _claimable(packetId, PacketKind.Password);
        if (claimedAddress[packetId][msg.sender]) revert AlreadyClaimed();
        if (commitment == bytes32(0)) revert InvalidCommitment();
        if (p.claimCount >= p.maxClaims) revert FullyClaimed();
        passwordCommitment[packetId][msg.sender] = commitment;
        passwordCommitBlock[packetId][msg.sender] = uint64(block.number);
        emit PasswordCommitted(packetId, msg.sender, commitment);
    }

    function revealPassword(uint256 packetId, bytes32 passwordDigest) external nonReentrant {
        Packet storage p = _claimable(packetId, PacketKind.Password);
        if (claimedAddress[packetId][msg.sender]) revert AlreadyClaimed();
        bytes32 commitment = passwordCommitment[packetId][msg.sender];
        if (commitment == bytes32(0)) revert InvalidCommitment();
        if (block.number <= passwordCommitBlock[packetId][msg.sender]) revert TooEarly();
        if (keccak256(abi.encode(packetId, msg.sender, passwordDigest, p.passwordSalt)) != commitment) revert InvalidCommitment();
        if (keccak256(abi.encodePacked(passwordDigest, p.passwordSalt)) != p.secretHash) revert InvalidSecret();
        delete passwordCommitment[packetId][msg.sender];
        delete passwordCommitBlock[packetId][msg.sender];
        claimedAddress[packetId][msg.sender] = true;
        _completeClaim(packetId, p, msg.sender, p.amountPerClaim);
    }

    function refundPacket(uint256 packetId) external nonReentrant {
        Packet storage p = packets[packetId];
        if (msg.sender != p.creator) revert NotAuthorized();
        if (block.timestamp <= p.deadline) revert NotExpired();
        uint256 value = p.remaining;
        if (value == 0) revert InvalidAmount();
        p.remaining = 0;
        _sendAsset(p.token, p.creator, value);
        emit PacketRefunded(packetId, p.creator, value);
    }

    function createEscrow(
        address token,
        address payee,
        address arbiter,
        uint128 amount,
        uint64 deadline,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (payee == address(0) || payee == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _validateDeadline(deadline);
        _collect(token, amount);
        id = nextEscrowId++;
        escrows[id] = Escrow(msg.sender, payee, arbiter, token, amount, deadline, EscrowStatus.Funded, metadataHash);
        emit EscrowCreated(id, msg.sender, payee, token, amount, deadline, arbiter, metadataHash);
    }

    function markDelivered(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.payee || e.status != EscrowStatus.Funded) revert NotAuthorized();
        e.status = EscrowStatus.Delivered;
        emit EscrowStatusChanged(escrowId, e.status);
    }

    function releaseEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.payer) revert NotAuthorized();
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.Delivered) revert InvalidState();
        e.status = EscrowStatus.Released;
        _sendAsset(e.token, e.payee, e.amount);
        emit EscrowStatusChanged(escrowId, e.status);
    }

    function refundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.payer) revert NotAuthorized();
        if (block.timestamp <= e.deadline) revert NotExpired();
        if (e.status != EscrowStatus.Funded) revert InvalidState();
        e.status = EscrowStatus.Refunded;
        _sendAsset(e.token, e.payer, e.amount);
        emit EscrowStatusChanged(escrowId, e.status);
    }

    function disputeEscrow(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.payer && msg.sender != e.payee) revert NotAuthorized();
        if (e.arbiter == address(0)) revert InvalidAddress();
        if (e.status != EscrowStatus.Funded && e.status != EscrowStatus.Delivered) revert InvalidState();
        e.status = EscrowStatus.Disputed;
        emit EscrowStatusChanged(escrowId, e.status);
    }

    function resolveEscrow(uint256 escrowId, uint128 payerAmount, uint128 payeeAmount) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.arbiter) revert NotAuthorized();
        if (e.status != EscrowStatus.Disputed) revert InvalidState();
        if (uint256(payerAmount) + payeeAmount != e.amount) revert InvalidAmount();
        e.status = EscrowStatus.Resolved;
        if (payerAmount != 0) _sendAsset(e.token, e.payer, payerAmount);
        if (payeeAmount != 0) _sendAsset(e.token, e.payee, payeeAmount);
        emit EscrowResolved(escrowId, payerAmount, payeeAmount);
    }

    function createSchedule(
        address token,
        address payee,
        uint128 amount,
        uint64 releaseTime,
        bool cancelable,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 id) {
        if (payee == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (releaseTime < block.timestamp + MIN_DEADLINE || releaseTime > block.timestamp + MAX_DEADLINE) revert InvalidDeadline();
        _collect(token, amount);
        id = nextScheduleId++;
        schedules[id] = ScheduledPayment(msg.sender, payee, token, amount, releaseTime, cancelable, false, false, metadataHash);
        emit Scheduled(id, msg.sender, payee, token, amount, releaseTime, cancelable, metadataHash);
    }

    function claimSchedule(uint256 scheduleId) external nonReentrant {
        ScheduledPayment storage s = schedules[scheduleId];
        if (s.payer == address(0) || s.claimed || s.cancelled) revert InvalidState();
        if (block.timestamp < s.releaseTime) revert TooEarly();
        s.claimed = true;
        _sendAsset(s.token, s.payee, s.amount);
        emit ScheduleClaimed(scheduleId, s.payee, s.amount);
    }

    function cancelSchedule(uint256 scheduleId) external nonReentrant {
        ScheduledPayment storage s = schedules[scheduleId];
        if (msg.sender != s.payer) revert NotAuthorized();
        if (!s.cancelable || s.claimed || s.cancelled || block.timestamp >= s.releaseTime) revert InvalidState();
        s.cancelled = true;
        _sendAsset(s.token, s.payer, s.amount);
        emit ScheduleCancelled(scheduleId, s.payer, s.amount);
    }

    function _storePacket(
        address token,
        address directedTo,
        uint256 total,
        uint96 amountPerClaim,
        uint32 maxClaims,
        uint64 deadline,
        PacketKind kind,
        bytes32 secretHash,
        bytes32 passwordSalt,
        bytes32 metadataHash
    ) private returns (uint256 id) {
        if (total == 0 || total > type(uint128).max) revert InvalidAmount();
        _collect(token, total);
        id = nextPacketId++;
        packets[id] = Packet({
            creator: msg.sender,
            token: token,
            directedTo: directedTo,
            remaining: uint128(total),
            amountPerClaim: amountPerClaim,
            deadline: deadline,
            createdBlock: uint64(block.number),
            maxClaims: maxClaims,
            claimCount: 0,
            kind: kind,
            secretHash: secretHash,
            randomSeed: bytes32(0),
            passwordSalt: passwordSalt,
            metadataHash: metadataHash
        });
        emit PacketCreated(id, msg.sender, token, kind, total, maxClaims, deadline, metadataHash);
    }

    function _claimable(uint256 packetId, PacketKind expected) private view returns (Packet storage p) {
        p = packets[packetId];
        if (p.creator == address(0)) revert InvalidAddress();
        if (p.kind != expected) revert WrongKind();
        if (block.timestamp > p.deadline) revert Expired();
        if (p.claimCount >= p.maxClaims) revert FullyClaimed();
    }

    function _completeClaim(uint256 packetId, Packet storage p, address to, uint256 value) private {
        if (value == 0 || value > p.remaining) revert InvalidAmount();
        p.remaining -= uint128(value);
        p.claimCount += 1;
        _sendAsset(p.token, to, value);
        emit PacketClaimed(packetId, to, value);
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

    function _pullExact(address token, address from, address to, uint256 amount) private {
        uint256 beforeBalance = IERC20(token).balanceOf(to);
        IERC20(token).safeTransferFrom(from, to, amount);
        if (IERC20(token).balanceOf(to) - beforeBalance != amount) revert UnsupportedTokenBehavior();
    }

    function _sendAsset(address token, address to, uint256 amount) private {
        if (token == NATIVE) {
            (bool ok,) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _validatePolicy(
        address policy,
        address recipient,
        address token,
        uint256 amount,
        bytes32 referenceId,
        bytes calldata policyData
    ) private {
        if (policy != address(0) && !ITapeFlowPolicy(policy).validate(msg.sender, token, recipient, amount, referenceId, policyData)) revert InvalidPolicy();
    }

    function _validateStealth(address stealthAddress, bytes calldata ephemeralPubKey, bytes calldata metadata) private pure {
        if (stealthAddress == address(0)) revert InvalidAddress();
        if (ephemeralPubKey.length == 0) revert InvalidCommitment();
        if (metadata.length > MAX_METADATA_BYTES) revert MetadataTooLarge();
    }

    function _validateCount(uint32 count) private pure {
        if (count == 0 || count > MAX_PACKET_CLAIMS) revert InvalidCount();
    }

    function _validateDeadline(uint64 deadline) private view {
        if (deadline < block.timestamp + MIN_DEADLINE || deadline > block.timestamp + MAX_DEADLINE) revert InvalidDeadline();
    }
}
