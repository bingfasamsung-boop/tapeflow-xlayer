// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title TapeFlow Price Oracle V1
/// @notice Multi-asset USD price registry for X Layer. An enabled off-chain
/// signer signs a bounded, one-use observation and any relayer may submit it.
/// The admin can rotate signers but cannot edit prices directly.
contract TapeFlowPriceOracleV1 {
    using MessageHashUtils for bytes32;

    bytes32 public constant QUOTE = bytes32("USD");
    uint64 public constant MAX_VALIDITY = 1 hours;
    uint64 public constant MAX_FUTURE_DRIFT = 2 minutes;

    struct PriceRecord {
        uint192 priceE18;
        uint64 updatedAt;
        address signer;
    }

    address public immutable ADMIN;
    mapping(address => bool) public isSigner;
    mapping(address => mapping(uint256 => bool)) public nonceUsed;
    mapping(address => PriceRecord) private _prices;

    event SignerSet(address indexed signer, bool enabled);
    event PriceUpdated(address indexed asset, uint256 priceE18, uint64 observedAt, address indexed signer, uint256 nonce);

    error InvalidAddress();
    error InvalidPrice();
    error InvalidTime();
    error NotAdmin();
    error UnauthorizedSigner();
    error NonceAlreadyUsed();
    error ObservationRollback();

    constructor(address admin_, address initialSigner_) {
        if (admin_ == address(0) || initialSigner_ == address(0)) revert InvalidAddress();
        ADMIN = admin_;
        isSigner[initialSigner_] = true;
        emit SignerSet(initialSigner_, true);
    }

    function setSigner(address signer, bool enabled) external {
        if (msg.sender != ADMIN) revert NotAdmin();
        if (signer == address(0)) revert InvalidAddress();
        isSigner[signer] = enabled;
        emit SignerSet(signer, enabled);
    }

    function priceDigest(
        address asset,
        uint192 priceE18,
        uint64 observedAt,
        uint64 validUntil,
        uint256 nonce
    ) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, asset, priceE18, observedAt, validUntil, nonce));
    }

    function submitPrice(
        address asset,
        uint192 priceE18,
        uint64 observedAt,
        uint64 validUntil,
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (priceE18 == 0) revert InvalidPrice();
        if (observedAt > block.timestamp + MAX_FUTURE_DRIFT) revert InvalidTime();
        if (validUntil < block.timestamp || validUntil < observedAt || validUntil > observedAt + MAX_VALIDITY) {
            revert InvalidTime();
        }

        bytes32 digest = priceDigest(asset, priceE18, observedAt, validUntil, nonce).toEthSignedMessageHash();
        address signer = ECDSA.recover(digest, signature);
        if (!isSigner[signer]) revert UnauthorizedSigner();
        if (nonceUsed[signer][nonce]) revert NonceAlreadyUsed();
        if (observedAt <= _prices[asset].updatedAt) revert ObservationRollback();

        nonceUsed[signer][nonce] = true;
        _prices[asset] = PriceRecord({priceE18: priceE18, updatedAt: observedAt, signer: signer});
        emit PriceUpdated(asset, priceE18, observedAt, signer, nonce);
    }

    function readPrice(address asset) external view returns (uint256 priceE18, uint256 updatedAt) {
        PriceRecord memory record = _prices[asset];
        return (record.priceE18, record.updatedAt);
    }

    function priceRecord(address asset) external view returns (PriceRecord memory) {
        return _prices[asset];
    }
}
