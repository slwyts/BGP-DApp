// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev A mock USDT token with 6 decimals.
 */
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev Mints tokens to an account.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
