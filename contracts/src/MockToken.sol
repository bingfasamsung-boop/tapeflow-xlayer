// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("TapeFlow Test USD", "tfUSD") {
        _mint(msg.sender, 10_000_000 ether);
    }
}
