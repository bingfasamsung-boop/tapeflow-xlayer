// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IChainlinkAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title Chainlink Price Adapter V1
/// @notice Immutable normalization adapter for one asset/feed pair.
contract ChainlinkPriceAdapterV1 {
    address public immutable asset;
    bytes32 public immutable quote;
    address public immutable feed;
    uint256 public immutable maxAge;
    uint8 public immutable feedDecimals;

    error InvalidConfiguration();
    error InvalidPrice();
    error StalePrice();

    constructor(address asset_, bytes32 quote_, address feed_, uint256 maxAge_) {
        if (quote_ == bytes32(0) || feed_ == address(0) || maxAge_ == 0) revert InvalidConfiguration();
        asset = asset_;
        quote = quote_;
        feed = feed_;
        maxAge = maxAge_;
        feedDecimals = IChainlinkAggregatorV3(feed_).decimals();
        if (feedDecimals > 36) revert InvalidConfiguration();
    }

    function readPrice() external view returns (uint256 priceE18, uint256 updatedAt) {
        (uint80 roundId, int256 answer,, uint256 timestamp, uint80 answeredInRound) =
            IChainlinkAggregatorV3(feed).latestRoundData();
        if (answer <= 0 || timestamp == 0 || answeredInRound < roundId) revert InvalidPrice();
        if (timestamp > block.timestamp || block.timestamp - timestamp > maxAge) revert StalePrice();

        uint256 unsignedAnswer = uint256(answer);
        if (feedDecimals < 18) priceE18 = unsignedAnswer * (10 ** (18 - feedDecimals));
        else if (feedDecimals > 18) priceE18 = unsignedAnswer / (10 ** (feedDecimals - 18));
        else priceE18 = unsignedAnswer;
        if (priceE18 == 0) revert InvalidPrice();
        updatedAt = timestamp;
    }
}
