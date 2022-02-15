// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Xpress is Initializable, ERC20Upgradeable {
    function initialize() initializer public {
        __ERC20_init("Xpress", "XPRESS");

        _mint(msg.sender, 10000000 * 10 ** decimals());
    }
}