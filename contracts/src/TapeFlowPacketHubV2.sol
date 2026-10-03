// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title TapeFlow Packet Hub V2
/// @notice Immutable red-packet escrow with both wallet claims and login-authorized,
/// gas-sponsored claims. A relayer can submit an authorizer-signed voucher, but the
/// contract always pays the recipient encoded in that voucher.
/// @dev Deploy a new version to rotate CLAIM_AUTHORIZER. There is no owner, proxy,
/// fee switch or arbitrary withdrawal function.
contract TapeFlowPacketHubV2 is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);
    uint32 public constant MAX_PACKET_CLAIMS = 500;
    uint64 public constant MIN_DEADLINE = 2 minutes;
    uint64 public constant MAX_DEADLINE = 365 days;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SERVICE_FEE_BPS = 10; // 0.1%

    bytes32 public constant CLAIM_VOUCHER_TYPEHASH = keccak256(
        "ClaimVoucher(uint256 packetId,address recipient,bytes32 identityNullifier,uint256 voucherNonce,uint64 validUntil)"
    );

    enum PacketKind { Equal, Directed, Lucky, Password }

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

    struct ClaimVoucher {
        uint256 packetId;
        address recipient;
        bytes32 identityNullifier;
        uint256 voucherNonce;
        uint64 validUntil;
    }

    address public immutable CLAIM_AUTHORIZER;
    address public immutable FEE_RECIPIENT;
    uint256 public nextPacketId = 1;

    mapping(uint256 => Packet) public packets;
    mapping(uint256 => mapping(address => bool)) public claimedAddress;
    mapping(uint256 => mapping(bytes32 => bool)) public claimedIdentity;
    mapping(bytes32 => bool) public usedVoucher;

    event PacketCreated(
        uint256 indexed packetId,
        address indexed creator,
        address indexed token,
        PacketKind kind,
        uint256 total,
        uint256 serviceFee,
        uint32 maxClaims,
        uint64 deadline,
        bytes32 metadataHash
    );
    event LuckyRevealed(uint256 indexed packetId, bytes32 seed);
    event PacketClaimed(
        uint256 indexed packetId,
        address indexed recipient,
        address indexed relayer,
        bytes32 identityNullifier,
        uint256 amount
    );
    event PacketRefunded(uint256 indexed packetId, address indexed creator, uint256 amount);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidCount();
    error InvalidDeadline();
    error InvalidSecret();
    error InvalidState();
    error InvalidVoucher();
    error VoucherExpired();
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

    constructor(address claimAuthorizer, address feeRecipient) EIP712("TapeFlow Packet Hub", "2") {
        if (claimAuthorizer == address(0) || feeRecipient == address(0)) revert InvalidAddress();
        CLAIM_AUTHORIZER = claimAuthorizer;
        FEE_RECIPIENT = feeRecipient;
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
        if (recipient == address(0) || total == 0) revert InvalidAddress();
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
        _revealLucky(packetId, secret, p);
    }

    /// @dev Shared reveal logic for successor contracts that support sponsored
    /// activation. Keeping the creator check in revealLucky preserves V2 behavior.
    function _revealLucky(uint256 packetId, bytes32 secret, Packet storage p) internal {
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
        if (passwordHash == bytes32(0) || passwordSalt == bytes32(0) || amountPerClaim == 0) revert InvalidAmount();
        _validateCount(maxClaims);
        _validateDeadline(deadline);
        uint256 total = uint256(amountPerClaim) * maxClaims;
        id = _storePacket(token, address(0), total, amountPerClaim, maxClaims, deadline, PacketKind.Password, passwordHash, passwordSalt, metadataHash);
    }

    /// @notice Wallet claim path. The claimant pays gas and receives the funds.
    function claimEqual(uint256 packetId) external nonReentrant {
        bytes32 identity = keccak256(abi.encodePacked("wallet", block.chainid, msg.sender));
        _claimEqual(packetId, msg.sender, identity, msg.sender);
    }

    /// @notice Walletless claim path. A login service signs the destination-bound voucher
    /// and any relayer can submit it and pay gas.
    function claimEqualTo(ClaimVoucher calldata voucher, bytes calldata signature) external nonReentrant {
        bytes32 identity = _consumeVoucher(voucher, signature);
        _claimEqual(voucher.packetId, voucher.recipient, identity, msg.sender);
    }

    /// @notice Anyone may execute a directed packet because funds can only go to directedTo.
    function claimDirected(uint256 packetId) external nonReentrant {
        Packet storage p = _claimable(packetId, PacketKind.Directed);
        if (p.claimCount != 0) revert AlreadyClaimed();
        bytes32 identity = keccak256(abi.encodePacked("directed", packetId, p.directedTo));
        _markClaimed(packetId, p.directedTo, identity);
        _completeClaim(packetId, p, p.directedTo, p.remaining, msg.sender, identity);
    }

    function claimLucky(uint256 packetId) external nonReentrant {
        bytes32 identity = keccak256(abi.encodePacked("wallet", block.chainid, msg.sender));
        _claimLucky(packetId, msg.sender, identity, msg.sender);
    }

    function claimLuckyTo(ClaimVoucher calldata voucher, bytes calldata signature) external nonReentrant {
        bytes32 identity = _consumeVoucher(voucher, signature);
        _claimLucky(voucher.packetId, voucher.recipient, identity, msg.sender);
    }

    function claimPassword(uint256 packetId, bytes32 passwordDigest) external nonReentrant {
        bytes32 identity = keccak256(abi.encodePacked("wallet", block.chainid, msg.sender));
        _claimPassword(packetId, msg.sender, identity, passwordDigest, msg.sender);
    }

    function claimPasswordTo(
        ClaimVoucher calldata voucher,
        bytes32 passwordDigest,
        bytes calldata signature
    ) external nonReentrant {
        bytes32 identity = _consumeVoucher(voucher, signature);
        _claimPassword(voucher.packetId, voucher.recipient, identity, passwordDigest, msg.sender);
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

    function voucherDigest(ClaimVoucher calldata voucher) external view returns (bytes32) {
        return _hashTypedDataV4(_voucherStructHash(voucher));
    }

    function _claimEqual(uint256 packetId, address recipient, bytes32 identity, address relayer) private {
        Packet storage p = _claimable(packetId, PacketKind.Equal);
        _markClaimed(packetId, recipient, identity);
        _completeClaim(packetId, p, recipient, p.amountPerClaim, relayer, identity);
    }

    function _claimLucky(uint256 packetId, address recipient, bytes32 identity, address relayer) private {
        Packet storage p = _claimable(packetId, PacketKind.Lucky);
        if (p.randomSeed == bytes32(0)) revert NotRevealed();
        _markClaimed(packetId, recipient, identity);
        uint256 slotsLeft = uint256(p.maxClaims) - p.claimCount;
        uint256 value = p.remaining;
        if (slotsLeft > 1) {
            uint256 minimum = value / (slotsLeft * 2);
            if (minimum == 0) minimum = 1;
            uint256 hardMaximum = value - minimum * (slotsLeft - 1);
            uint256 softMaximum = value * 3 / (slotsLeft * 2);
            uint256 maximum = softMaximum < hardMaximum ? softMaximum : hardMaximum;
            if (maximum < minimum) maximum = minimum;
            value = minimum + uint256(keccak256(abi.encode(p.randomSeed, packetId, identity, p.claimCount))) % (maximum - minimum + 1);
        }
        _completeClaim(packetId, p, recipient, value, relayer, identity);
    }

    function _claimPassword(
        uint256 packetId,
        address recipient,
        bytes32 identity,
        bytes32 passwordDigest,
        address relayer
    ) private {
        Packet storage p = _claimable(packetId, PacketKind.Password);
        if (keccak256(abi.encodePacked(passwordDigest, p.passwordSalt)) != p.secretHash) revert InvalidSecret();
        _markClaimed(packetId, recipient, identity);
        _completeClaim(packetId, p, recipient, p.amountPerClaim, relayer, identity);
    }

    function _consumeVoucher(ClaimVoucher calldata voucher, bytes calldata signature) private returns (bytes32) {
        if (voucher.recipient == address(0) || voucher.identityNullifier == bytes32(0)) revert InvalidVoucher();
        if (block.timestamp > voucher.validUntil) revert VoucherExpired();
        bytes32 structHash = _voucherStructHash(voucher);
        bytes32 digest = _hashTypedDataV4(structHash);
        if (ECDSA.recover(digest, signature) != CLAIM_AUTHORIZER) revert InvalidVoucher();
        if (usedVoucher[structHash]) revert InvalidVoucher();
        usedVoucher[structHash] = true;
        return voucher.identityNullifier;
    }

    function _voucherStructHash(ClaimVoucher calldata voucher) private pure returns (bytes32) {
        return keccak256(abi.encode(
            CLAIM_VOUCHER_TYPEHASH,
            voucher.packetId,
            voucher.recipient,
            voucher.identityNullifier,
            voucher.voucherNonce,
            voucher.validUntil
        ));
    }

    function _markClaimed(uint256 packetId, address recipient, bytes32 identity) private {
        if (claimedAddress[packetId][recipient] || claimedIdentity[packetId][identity]) revert AlreadyClaimed();
        claimedAddress[packetId][recipient] = true;
        claimedIdentity[packetId][identity] = true;
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
        uint256 serviceFee = quoteServiceFee(total);
        _collect(token, total + serviceFee);
        _sendAsset(token, FEE_RECIPIENT, serviceFee);
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
        emit PacketCreated(id, msg.sender, token, kind, total, serviceFee, maxClaims, deadline, metadataHash);
    }

    function quoteServiceFee(uint256 total) public pure returns (uint256) {
        if (total == 0) return 0;
        return (total * SERVICE_FEE_BPS + BPS_DENOMINATOR - 1) / BPS_DENOMINATOR;
    }

    function _claimable(uint256 packetId, PacketKind expected) private view returns (Packet storage p) {
        p = packets[packetId];
        if (p.creator == address(0)) revert InvalidAddress();
        if (p.kind != expected) revert WrongKind();
        if (block.timestamp > p.deadline) revert Expired();
        if (p.claimCount >= p.maxClaims) revert FullyClaimed();
    }

    function _completeClaim(
        uint256 packetId,
        Packet storage p,
        address recipient,
        uint256 value,
        address relayer,
        bytes32 identity
    ) private {
        if (value == 0 || value > p.remaining) revert InvalidAmount();
        p.remaining -= uint128(value);
        p.claimCount += 1;
        _sendAsset(p.token, recipient, value);
        emit PacketClaimed(packetId, recipient, relayer, identity, value);
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

    function _sendAsset(address token, address to, uint256 amount) internal {
        if (token == NATIVE) {
            (bool ok,) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _validateCount(uint32 count) private pure {
        if (count == 0 || count > MAX_PACKET_CLAIMS) revert InvalidCount();
    }

    function _validateDeadline(uint64 deadline) private view {
        if (deadline < block.timestamp + MIN_DEADLINE || deadline > block.timestamp + MAX_DEADLINE) revert InvalidDeadline();
    }
}
