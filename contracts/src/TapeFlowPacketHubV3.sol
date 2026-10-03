// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TapeFlowPacketHubV2} from "./TapeFlowPacketHubV2.sol";

/// @title TapeFlow Packet Hub V3
/// @notice Adds permissionless lucky-packet activation so a sponsored relayer can
/// finish the commit-reveal flow without requiring a second creator transaction.
/// Knowledge of the committed secret only permits activation; it cannot redirect,
/// claim or refund packet funds.
/// @dev Claim vouchers intentionally retain the V2 EIP-712 domain for compatibility.
contract TapeFlowPacketHubV3 is TapeFlowPacketHubV2 {
    constructor(address claimAuthorizer, address feeRecipient)
        TapeFlowPacketHubV2(claimAuthorizer, feeRecipient)
    {}

    function activateLucky(uint256 packetId, bytes32 secret) external {
        Packet storage p = packets[packetId];
        if (p.creator == address(0)) revert InvalidAddress();
        if (p.kind != PacketKind.Lucky) revert WrongKind();
        _revealLucky(packetId, secret, p);
    }
}
