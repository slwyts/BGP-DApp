// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {IAntiSybil} from "./AntiSybil.sol";

contract BGPToken is ERC20, ERC20Burnable {

    uint256 private constant MAX_SUPPLY = 10_000_000_000 * 10**18;
    IAntiSybil public immutable antiSybilContract;

    error AddressBlacklisted(address account);
    error ZeroAddress();

    constructor(
        address _antiSybilAddress
    )
        ERC20("BelaChain Growth Points", "BGP")
    {
        if (_antiSybilAddress == address(0)) revert ZeroAddress();
        antiSybilContract = IAntiSybil(_antiSybilAddress);
        _update(address(0), msg.sender, MAX_SUPPLY);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20) {
        if (antiSybilContract.isBlacklisted(from) || antiSybilContract.isBlacklisted(to)) revert AddressBlacklisted(from);
        super._update(from, to, value);
    }
}
