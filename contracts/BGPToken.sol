// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./AntiSybil.sol"; 

contract BGPToken is ERC20, ERC20Burnable {
    
    uint256 private constant MAX_SUPPLY = 10_000_000_000 * 10**18;
    IAntiSybil private immutable antiSybilContract;

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
        if (antiSybilContract.isBlacklisted(from)) revert AddressBlacklisted(from);
        if (antiSybilContract.isBlacklisted(to)) revert AddressBlacklisted(to);

        super._update(from, to, value);
    }
}