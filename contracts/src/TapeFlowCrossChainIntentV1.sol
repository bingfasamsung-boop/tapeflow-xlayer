// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TapeFlow Cross-chain Intent Escrow V1
/// @notice Source-chain escrow for solver-based payments. Settlement is released only when
/// the payer confirms the destination payment. It does not claim bridge-less consensus.
contract TapeFlowCrossChainIntentV1 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { None, Open, Settled, Refunded }

    struct Intent {
        address payer;
        address sourceToken;
        uint128 sourceAmount;
        uint64 destinationChainId;
        address destinationRecipient;
        address destinationToken;
        uint128 minimumDestinationAmount;
        uint64 deadline;
        Status status;
        address solver;
        bytes32 destinationProofHash;
    }

    uint256 public nextIntentId = 1;
    mapping(uint256 => Intent) public intents;

    event IntentCreated(uint256 indexed intentId, address indexed payer, address indexed recipient, uint64 destinationChainId, address sourceToken, uint256 sourceAmount, address destinationToken, uint256 minimumDestinationAmount, uint64 deadline);
    event IntentSettled(uint256 indexed intentId, address indexed solver, bytes32 destinationProofHash);
    event IntentRefunded(uint256 indexed intentId);

    error InvalidInput();
    error InvalidState();
    error NotAuthorized();
    error NotExpired();
    error TransferFailed();

    function createIntent(
        address sourceToken,
        uint128 sourceAmount,
        uint64 destinationChainId,
        address destinationRecipient,
        address destinationToken,
        uint128 minimumDestinationAmount,
        uint64 deadline
    ) external payable nonReentrant returns (uint256 id) {
        if (sourceAmount == 0 || minimumDestinationAmount == 0 || destinationRecipient == address(0)) revert InvalidInput();
        if (destinationChainId == block.chainid || deadline <= block.timestamp + 2 minutes) revert InvalidInput();
        _collect(sourceToken, sourceAmount);
        id = nextIntentId++;
        intents[id] = Intent(msg.sender, sourceToken, sourceAmount, destinationChainId, destinationRecipient, destinationToken, minimumDestinationAmount, deadline, Status.Open, address(0), bytes32(0));
        emit IntentCreated(id, msg.sender, destinationRecipient, destinationChainId, sourceToken, sourceAmount, destinationToken, minimumDestinationAmount, deadline);
    }

    /// @notice The payer confirms a destination-chain payment after checking its explorer proof.
    function confirmSettlement(uint256 intentId, address solver, bytes32 destinationProofHash) external nonReentrant {
        Intent storage i = intents[intentId];
        if (msg.sender != i.payer) revert NotAuthorized();
        if (i.status != Status.Open || solver == address(0) || destinationProofHash == bytes32(0)) revert InvalidState();
        i.status = Status.Settled;
        i.solver = solver;
        i.destinationProofHash = destinationProofHash;
        _send(i.sourceToken, solver, i.sourceAmount);
        emit IntentSettled(intentId, solver, destinationProofHash);
    }

    function refund(uint256 intentId) external nonReentrant {
        Intent storage i = intents[intentId];
        if (msg.sender != i.payer) revert NotAuthorized();
        if (i.status != Status.Open) revert InvalidState();
        if (block.timestamp <= i.deadline) revert NotExpired();
        i.status = Status.Refunded;
        _send(i.sourceToken, i.payer, i.sourceAmount);
        emit IntentRefunded(intentId);
    }

    function _collect(address token, uint256 amount) private {
        if (token == address(0)) {
            if (msg.value != amount) revert InvalidInput();
        } else {
            if (msg.value != 0) revert InvalidInput();
            uint256 beforeBalance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            if (IERC20(token).balanceOf(address(this)) - beforeBalance != amount) revert InvalidInput();
        }
    }

    function _send(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool ok,) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
