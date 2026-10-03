// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ITapeFlowPolicy} from "./TapeFlowXHubV1.sol";

/// @notice Self-custodied spending limits. Each payer controls only its own policy.
/// A TapeOut PaymentGuard circuit can later replace this contract through the same interface.
contract TapeFlowBudgetPolicyV1 is ITapeFlowPolicy {
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

    event BudgetSet(address indexed payer, uint128 singleLimit, uint128 dailyLimit, bool usesAllowlist);
    event RecipientSet(address indexed payer, address indexed recipient, bool allowed);
    event Frozen(address indexed payer, bool frozen);

    error NotHub();
    error PaymentDenied();

    address public immutable HUB;

    constructor(address hub) {
        HUB = hub;
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
        Budget storage b = budgets[payer];
        uint64 currentDay = uint64(block.timestamp / 1 days);
        if (currentDay != b.day) {
            b.day = currentDay;
            b.spentToday = 0;
        }
        if (b.frozen) revert PaymentDenied();
        if (b.singleLimit != 0 && amount > b.singleLimit) revert PaymentDenied();
        if (b.dailyLimit != 0 && uint256(b.spentToday) + amount > b.dailyLimit) revert PaymentDenied();
        if (usesAllowlist[payer] && !recipientAllowed[payer][recipient]) revert PaymentDenied();
        b.spentToday += uint128(amount);
        return true;
    }
}
