// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ITapeFlowMultiAssetOracle {
    function readPrice(address asset) external view returns (uint256 priceE18, uint256 updatedAt);
}

/// @title TapeLock V2
/// @notice Immutable time and oracle-confirmed locks for native OKB or any
/// standard ERC-20 for which the configured TapeFlow oracle has a fresh price.
/// Every price lock has a mandatory fallback time so oracle failure cannot
/// trap the beneficiary's funds forever.
contract TapeLockV2 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);
    uint64 public constant MIN_LOCK_TIME = 2 minutes;
    uint64 public constant MAX_LOCK_TIME = 10 * 365 days;
    uint32 public constant MIN_PRICE_CONFIRMATION = 5 minutes;
    uint32 public constant MAX_PRICE_CONFIRMATION = 7 days;
    uint64 public constant MAX_ORACLE_AGE = 1 hours;

    enum Condition { TimeOnly, PriceOnly, TimeAndPrice, TimeOrPrice }
    enum Direction { AtOrAbove, AtOrBelow }

    struct LockPosition {
        address creator;
        address beneficiary;
        address token;
        uint256 amount;
        uint192 targetPriceE18;
        uint64 unlockTime;
        uint64 fallbackTime;
        uint64 priceFirstConfirmedAt;
        uint32 confirmationDelay;
        Condition condition;
        Direction direction;
        bool claimed;
        bytes32 metadataHash;
    }

    address public immutable ORACLE;
    uint256 public nextLockId = 1;
    mapping(uint256 => LockPosition) public locks;
    mapping(address => uint256[]) private _beneficiaryLocks;
    mapping(address => uint256[]) private _creatorLocks;

    event LockCreated(
        uint256 indexed lockId,
        address indexed creator,
        address indexed beneficiary,
        address token,
        uint256 amount,
        Condition condition,
        uint64 unlockTime,
        uint64 fallbackTime,
        uint256 targetPriceE18,
        Direction direction,
        uint32 confirmationDelay,
        bytes32 metadataHash
    );
    event PriceConfirmationStarted(uint256 indexed lockId, uint256 priceE18, uint256 oracleUpdatedAt);
    event PriceConfirmationReset(uint256 indexed lockId, uint256 priceE18, uint256 oracleUpdatedAt);
    event LockClaimed(uint256 indexed lockId, address indexed beneficiary, address token, uint256 amount, address executor);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidTime();
    error InvalidCondition();
    error InvalidPrice();
    error NotClaimable();
    error AlreadyClaimed();
    error UnsupportedTokenBehavior();
    error TransferFailed();

    constructor(address oracle_) {
        if (oracle_ == address(0)) revert InvalidAddress();
        ORACLE = oracle_;
    }

    function createLock(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 unlockTime,
        uint64 fallbackTime,
        Condition condition,
        Direction direction,
        uint192 targetPriceE18,
        uint32 confirmationDelay,
        bytes32 metadataHash
    ) external payable nonReentrant returns (uint256 lockId) {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        bool usesTime = _usesTime(condition);
        bool usesPrice = _usesPrice(condition);
        if (!usesTime && !usesPrice) revert InvalidCondition();
        if (usesTime) _validateFutureTime(unlockTime);
        else if (unlockTime != 0) revert InvalidTime();

        if (usesPrice) {
            if (targetPriceE18 == 0) revert InvalidPrice();
            if (confirmationDelay < MIN_PRICE_CONFIRMATION || confirmationDelay > MAX_PRICE_CONFIRMATION) revert InvalidTime();
            _validateFutureTime(fallbackTime);
            if (usesTime && fallbackTime < unlockTime) revert InvalidTime();
            _readFreshPrice(token);
        } else if (targetPriceE18 != 0 || confirmationDelay != 0 || fallbackTime != 0) {
            revert InvalidCondition();
        }

        _collect(token, amount);
        lockId = nextLockId++;
        locks[lockId] = LockPosition({
            creator: msg.sender,
            beneficiary: beneficiary,
            token: token,
            amount: amount,
            targetPriceE18: targetPriceE18,
            unlockTime: unlockTime,
            fallbackTime: fallbackTime,
            priceFirstConfirmedAt: 0,
            confirmationDelay: confirmationDelay,
            condition: condition,
            direction: direction,
            claimed: false,
            metadataHash: metadataHash
        });
        _beneficiaryLocks[beneficiary].push(lockId);
        _creatorLocks[msg.sender].push(lockId);
        emit LockCreated(lockId, msg.sender, beneficiary, token, amount, condition, unlockTime, fallbackTime, targetPriceE18, direction, confirmationDelay, metadataHash);
    }

    function checkPrice(uint256 lockId) external returns (bool conditionMet, uint256 priceE18, uint256 oracleUpdatedAt) {
        LockPosition storage position = locks[lockId];
        if (!_usesPrice(position.condition) || position.claimed) revert InvalidCondition();
        (conditionMet, priceE18, oracleUpdatedAt) = _readPriceCondition(position);
        if (conditionMet) {
            if (position.priceFirstConfirmedAt == 0) {
                position.priceFirstConfirmedAt = uint64(oracleUpdatedAt);
                emit PriceConfirmationStarted(lockId, priceE18, oracleUpdatedAt);
            }
        } else if (position.priceFirstConfirmedAt != 0) {
            position.priceFirstConfirmedAt = 0;
            emit PriceConfirmationReset(lockId, priceE18, oracleUpdatedAt);
        }
    }

    function claim(uint256 lockId) external nonReentrant {
        LockPosition storage position = locks[lockId];
        if (position.creator == address(0)) revert InvalidAddress();
        if (position.claimed) revert AlreadyClaimed();
        (bool canClaim,,,,) = status(lockId);
        if (!canClaim) revert NotClaimable();
        position.claimed = true;
        _sendAsset(position.token, position.beneficiary, position.amount);
        emit LockClaimed(lockId, position.beneficiary, position.token, position.amount, msg.sender);
    }

    function status(uint256 lockId) public view returns (bool claimable, bool timeMet, bool priceMet, bool priceConfirmed, uint256 currentPriceE18) {
        LockPosition storage position = locks[lockId];
        if (position.creator == address(0)) revert InvalidAddress();
        if (position.claimed) return (false, true, true, true, 0);

        timeMet = !_usesTime(position.condition) || block.timestamp >= position.unlockTime;
        bool fallbackMet = _usesPrice(position.condition) && block.timestamp >= position.fallbackTime;
        if (_usesPrice(position.condition) && !fallbackMet) {
            uint256 updatedAt;
            (priceMet, currentPriceE18, updatedAt) = _readPriceCondition(position);
            priceConfirmed = priceMet && position.priceFirstConfirmedAt != 0
                && updatedAt >= uint256(position.priceFirstConfirmedAt) + position.confirmationDelay;
        }

        if (fallbackMet) return (true, timeMet, priceMet, priceConfirmed, currentPriceE18);
        if (position.condition == Condition.TimeOnly) claimable = timeMet;
        else if (position.condition == Condition.PriceOnly) claimable = priceConfirmed;
        else if (position.condition == Condition.TimeAndPrice) claimable = timeMet && priceConfirmed;
        else claimable = timeMet || priceConfirmed;
    }

    function beneficiaryLockCount(address beneficiary) external view returns (uint256) { return _beneficiaryLocks[beneficiary].length; }
    function beneficiaryLockAt(address beneficiary, uint256 index) external view returns (uint256) { return _beneficiaryLocks[beneficiary][index]; }
    function creatorLockCount(address creator) external view returns (uint256) { return _creatorLocks[creator].length; }
    function creatorLockAt(address creator, uint256 index) external view returns (uint256) { return _creatorLocks[creator][index]; }

    function _readPriceCondition(LockPosition storage position) private view returns (bool met, uint256 priceE18, uint256 updatedAt) {
        (priceE18, updatedAt) = _readFreshPrice(position.token);
        met = position.direction == Direction.AtOrAbove ? priceE18 >= position.targetPriceE18 : priceE18 <= position.targetPriceE18;
    }

    function _readFreshPrice(address asset) private view returns (uint256 priceE18, uint256 updatedAt) {
        (priceE18, updatedAt) = ITapeFlowMultiAssetOracle(ORACLE).readPrice(asset);
        if (priceE18 == 0 || updatedAt == 0 || updatedAt > block.timestamp || block.timestamp - updatedAt > MAX_ORACLE_AGE) revert InvalidPrice();
    }

    function _usesTime(Condition condition) private pure returns (bool) {
        return condition == Condition.TimeOnly || condition == Condition.TimeAndPrice || condition == Condition.TimeOrPrice;
    }
    function _usesPrice(Condition condition) private pure returns (bool) {
        return condition == Condition.PriceOnly || condition == Condition.TimeAndPrice || condition == Condition.TimeOrPrice;
    }
    function _validateFutureTime(uint64 value) private view {
        if (value < block.timestamp + MIN_LOCK_TIME || value > block.timestamp + MAX_LOCK_TIME) revert InvalidTime();
    }
    function _collect(address token, uint256 amount) private {
        if (token == NATIVE) { if (msg.value != amount) revert InvalidAmount(); return; }
        if (msg.value != 0) revert InvalidAmount();
        IERC20 asset = IERC20(token);
        uint256 beforeBalance = asset.balanceOf(address(this));
        asset.safeTransferFrom(msg.sender, address(this), amount);
        if (asset.balanceOf(address(this)) != beforeBalance + amount) revert UnsupportedTokenBehavior();
    }
    function _sendAsset(address token, address recipient, uint256 amount) private {
        if (token == NATIVE) {
            (bool ok,) = payable(recipient).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else IERC20(token).safeTransfer(recipient, amount);
    }
}
