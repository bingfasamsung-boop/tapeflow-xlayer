// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ITapeFlowPolicy} from "./TapeFlowXHubV1.sol";

interface ITapeOutCircuitEvaluator {
    function eval(uint256 circuitId, bytes calldata input) external view returns (bytes memory output);
}

/// @title TapeFlow Circuit Budget Policy V1
/// @notice A self-custodied payment budget whose final allow/deny decision is
/// evaluated by an immutable TapeOut circuit on X Layer.
/// @dev The circuit has five little-endian one-bit inputs and one output bit:
/// [notFrozen, singleLimitOk, dailyLimitOk, allowlistOk, addressesOk] -> allow.
contract TapeFlowCircuitBudgetPolicyV1 is ITapeFlowPolicy {
    struct Budget {
        uint128 singleLimit;
        uint128 dailyLimit;
        uint128 spentToday;
        uint64 day;
        bool frozen;
    }

    mapping(address => Budget) public budgets;
    mapping(address => mapping(address => bool)) public recipientAllowed;
    mapping(address => bool) public usesAllowlist;

    address public immutable HUB;
    address public immutable PROCESSOR;
    uint256 public immutable CIRCUIT_ID;

    event BudgetSet(address indexed payer, uint128 singleLimit, uint128 dailyLimit, bool usesAllowlist);
    event RecipientSet(address indexed payer, address indexed recipient, bool allowed);
    event Frozen(address indexed payer, bool frozen);
    event CircuitDecision(address indexed payer, uint8 flags, bool allowed);

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

    function setBudget(uint128 singleLimit, uint128 dailyLimit, bool enableAllowlist) external {
        Budget storage b = budgets[msg.sender];
        b.singleLimit = singleLimit;
        b.dailyLimit = dailyLimit;
        b.spentToday = 0;
        b.day = uint64(block.timestamp / 1 days);
        usesAllowlist[msg.sender] = enableAllowlist;
        emit BudgetSet(msg.sender, singleLimit, dailyLimit, enableAllowlist);
    }

    function setRecipient(address recipient, bool allowed) external {
        recipientAllowed[msg.sender][recipient] = allowed;
        emit RecipientSet(msg.sender, recipient, allowed);
    }

    function setFrozen(bool value) external {
        budgets[msg.sender].frozen = value;
        emit Frozen(msg.sender, value);
    }

    function validate(
        address payer,
        address,
        address recipient,
        uint256 amount,
        bytes32,
        bytes calldata
    ) external returns (bool) {
        if (msg.sender != HUB) revert NotHub();
        if (amount > type(uint128).max) revert PaymentDenied();

        Budget storage b = budgets[payer];
        uint64 currentDay = uint64(block.timestamp / 1 days);
        uint128 spent = currentDay == b.day ? b.spentToday : 0;

        bool notFrozen = !b.frozen;
        bool singleLimitOk = b.singleLimit == 0 || amount <= b.singleLimit;
        bool dailyLimitOk = b.dailyLimit == 0 || uint256(spent) + amount <= b.dailyLimit;
        bool allowlistOk = !usesAllowlist[payer] || recipientAllowed[payer][recipient];
        bool addressesOk = payer != address(0) && recipient != address(0);

        uint8 flags = (notFrozen ? 1 : 0)
            | (singleLimitOk ? 2 : 0)
            | (dailyLimitOk ? 4 : 0)
            | (allowlistOk ? 8 : 0)
            | (addressesOk ? 16 : 0);

        bytes memory output = ITapeOutCircuitEvaluator(PROCESSOR).eval(
            CIRCUIT_ID,
            abi.encodePacked(bytes1(flags))
        );
        if (output.length == 0) revert InvalidCircuitOutput();
        bool allowed = (uint8(output[0]) & 1) == 1;
        emit CircuitDecision(payer, flags, allowed);
        if (!allowed) revert PaymentDenied();

        if (currentDay != b.day) {
            b.day = currentDay;
            b.spentToday = 0;
        }
        b.spentToday += uint128(amount);
        return true;
    }
}
