// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract MockPriceAdapter {
    address public immutable asset;
    bytes32 public immutable quote;
    uint256 public priceE18;
    uint256 public updatedAt;

    constructor(address asset_, bytes32 quote_, uint256 price_) {
        asset = asset_;
        quote = quote_;
        setPrice(price_);
    }

    function setPrice(uint256 price_) public {
        priceE18 = price_;
        updatedAt = block.timestamp;
    }

    function readPrice() external view returns (uint256, uint256) {
        return (priceE18, updatedAt);
    }
}
