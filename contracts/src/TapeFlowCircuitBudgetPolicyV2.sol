// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ITapeFlowPolicy} from "./TapeFlowXHubV1.sol";

interface ITapeOutCircuitEvaluatorV2 {
    function eval(uint256 circuitId, bytes calldata input) external view returns (bytes memory output);
}

/// @title TapeFlow Circuit Budget Policy V2
/// @notice Per-payer, per-asset budgets whose final allow/deny decision is
/// evaluated by the immutable TapeOut circuit on X Layer.
/// @dev Inputs are five little-endian bits:
/// [notFrozen, singleLimitOk, dailyLimitOk, allowlistOk, addressesOk].
contract TapeFlowCircuitBudgetPolicyV2 is ITapeFlowPolicy {
    struct Budget {
        uint128 singleLimit;
        uint128 dailyLimit;
        uint128 spentToday;
        uint64 day;
        bool frozen;
    }

    mapping(address => mapping(address => Budget)) public budgets;
    mapping(address => mapping(address => mapping(address => bool))) public recipientAllowed;
    mapping(address => mapping(address => bool)) public usesAllowlist;

    address public immutable HUB;
    address public immutable PROCESSOR;
    uint256 public immutable CIRCUIT_ID;

    event BudgetSet(address indexed payer, address indexed token, uint128 singleLimit, uint128 dailyLimit, bool usesAllowlist);
    event RecipientSet(address indexed payer, address indexed token, address indexed recipient, bool allowed);
    event Frozen(address indexed payer, address indexed token, bool frozen);
    event CircuitDecision(address indexed payer, address indexed token, uint8 flags, bool allowed);

    error InvalidAddress();
    error NotHub();
    error PaymentDenied();
    error InvalidCircuitOutput();

    constructor(address hub, address processor, uint256 circuitId) {
        if (hub == address(0) || processor == address(0)) revert InvalidAddress();
        HUB = hub;
        PROCESSOR = processor;
        CIRCUIT_ID = circuitId;
    }

    function setBudget(address token, uint128 singleLimit, uint128 dailyLimit, bool enableAllowlist) external {
        Budget storage b = budgets[msg.sender][token];
        b.singleLimit = singleLimit;
        b.dailyLimit = dailyLimit;
        b.spentToday = 0;
        b.day = uint64(block.timestamp / 1 days);
        usesAllowlist[msg.sender][token] = enableAllowlist;
        emit BudgetSet(msg.sender, token, singleLimit, dailyLimit, enableAllowlist);
    }

    function setRecipient(address token, address recipient, bool allowed) external {
        if (recipient == address(0)) revert InvalidAddress();
        recipientAllowed[msg.sender][token][recipient] = allowed;
        emit RecipientSet(msg.sender, token, recipient, allowed);
    }

    function setFrozen(address token, bool value) external {
        budgets[msg.sender][token].frozen = value;
        emit Frozen(msg.sender, token, value);
    }

    function validate(
        address payer,
        address token,
        address recipient,
        uint256 amount,
        bytes32,
        bytes calldata
    ) external returns (bool) {
        if (msg.sender != HUB) revert NotHub();
        if (amount > type(uint128).max) revert PaymentDenied();

        Budget storage b = budgets[payer][token];
        uint64 currentDay = uint64(block.timestamp / 1 days);
        uint128 spent = currentDay == b.day ? b.spentToday : 0;

        bool notFrozen = !b.frozen;
        bool singleLimitOk = b.singleLimit == 0 || amount <= b.singleLimit;
        bool dailyLimitOk = b.dailyLimit == 0 || uint256(spent) + amount <= b.dailyLimit;
        bool allowlistOk = !usesAllowlist[payer][token] || recipientAllowed[payer][token][recipient];
        bool addressesOk = payer != address(0) && recipient != address(0);

        uint8 flags = (notFrozen ? 1 : 0)
            | (singleLimitOk ? 2 : 0)
            | (dailyLimitOk ? 4 : 0)
            | (allowlistOk ? 8 : 0)
            | (addressesOk ? 16 : 0);

        bytes memory output = ITapeOutCircuitEvaluatorV2(PROCESSOR).eval(CIRCUIT_ID, abi.encodePacked(bytes1(flags)));
        if (output.length == 0) revert InvalidCircuitOutput();
        bool allowed = (uint8(output[0]) & 1) == 1;
        emit CircuitDecision(payer, token, flags, allowed);
        if (!allowed) revert PaymentDenied();

        if (currentDay != b.day) {
            b.day = currentDay;
            b.spentToday = 0;
        }
        b.spentToday += uint128(amount);
        return true;
    }
}
