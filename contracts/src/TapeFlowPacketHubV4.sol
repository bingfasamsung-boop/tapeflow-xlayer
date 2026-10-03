// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {TapeFlowPacketHubV3} from "./TapeFlowPacketHubV3.sol";

/// @title TapeFlow Packet Hub V4
/// @notice Adds permissionless expiry settlement. After a packet expires, any
/// account or automation may trigger the refund, but the contract always sends
/// the unclaimed principal to the creator recorded at creation time.
/// @dev The original creator-only refundPacket function remains available for
/// compatibility. Service fees are paid at creation and are not part of
/// Packet.remaining, so they cannot be refunded by either path.
contract TapeFlowPacketHubV4 is TapeFlowPacketHubV3 {
    constructor(address claimAuthorizer, address feeRecipient)
        TapeFlowPacketHubV3(claimAuthorizer, feeRecipient)
    {}

    function refundExpiredPacket(uint256 packetId) external nonReentrant {
        Packet storage p = packets[packetId];
        if (p.creator == address(0)) revert InvalidAddress();
        if (block.timestamp <= p.deadline) revert NotExpired();
        uint256 value = p.remaining;
        if (value == 0) revert InvalidAmount();
        p.remaining = 0;
        _sendAsset(p.token, p.creator, value);
        emit PacketRefunded(packetId, p.creator, value);
    }
}
