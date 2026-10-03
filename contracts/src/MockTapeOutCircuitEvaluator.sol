// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @dev Test-only evaluator matching TapeFlow Policy Gate V1: all five bits must be 1.
contract MockTapeOutCircuitEvaluator {
    function eval(uint256, bytes calldata input) external pure returns (bytes memory output) {
        bool allowed = input.length != 0 && (uint8(input[0]) & 31) == 31;
        return abi.encodePacked(bytes1(allowed ? 0x01 : 0x00));
    }
}
