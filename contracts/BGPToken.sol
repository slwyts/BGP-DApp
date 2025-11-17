// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./AntiSybil.sol"; 

contract BGPToken is ERC20, ERC20Burnable {
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**18;
    IAntiSybil public immutable antiSybilContract;

    constructor(
        address _antiSybilAddress
    ) 
        ERC20("BelaChain Growth Points", "BGP") 
    {
        require(_antiSybilAddress != address(0), "BGPToken: AntiSybil address cannot be zero");
        antiSybilContract = IAntiSybil(_antiSybilAddress);
        _update(address(0), msg.sender, MAX_SUPPLY);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20) {
        require(!antiSybilContract.isBlacklisted(from), "BGPToken: Sender is blacklisted");
        require(!antiSybilContract.isBlacklisted(to), "BGPToken: Recipient is blacklisted");

        super._update(from, to, value);
    }
}