// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

abstract contract FeeModule is Ownable {
    function _getTreasury() internal view virtual returns (address payable);
    address public constant CHAINLINK_ETH_USD_MAINNET = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    uint256 public constant MIN_FEE_USD = 60;
    uint256 public constant USD_PRECISION = 100;
    uint256 public simulatedEthPrice = 3000;
    bool public useChainlink;
    
    event FeeCollected(address indexed user, uint256 amount, uint256 ethPrice);
    event SimulatedPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ChainlinkToggled(bool enabled);
    
    constructor() {
        useChainlink = block.chainid == 8453;
    }

    function getEthPrice() public view returns (uint256 price) {
        if (useChainlink) {
            try AggregatorV3Interface(CHAINLINK_ETH_USD_MAINNET).latestRoundData() returns (
                uint80,
                int256 answer,
                uint256,
                uint256,
                uint80
            ) {
                require(answer > 0, "Invalid price from Chainlink");
                return uint256(answer);
            } catch {
                return simulatedEthPrice * 10**8;
            }
        } else {
            return simulatedEthPrice * 10**8;
        }
    }

    function getMinFee() public view returns (uint256 minFee) {
        uint256 ethPrice = getEthPrice();
        minFee = (MIN_FEE_USD * 10**18 * 10**8) / (USD_PRECISION * ethPrice);
        
        return minFee;
    }

    function _collectFee(uint256 amount) internal {
        uint256 minFee = getMinFee();
        require(amount >= minFee, "Fee too low");
        uint256 ethPrice = getEthPrice();
        (bool success, ) = _getTreasury().call{value: amount}("");
        require(success, "Fee transfer failed");
        
        emit FeeCollected(msg.sender, amount, ethPrice);
    }
    
    function setSimulatedPrice(uint256 _price) external onlyOwner {
        require(!useChainlink, "Cannot set price on mainnet");
        require(_price > 0, "Invalid price");
        
        uint256 oldPrice = simulatedEthPrice;
        simulatedEthPrice = _price;
        
        emit SimulatedPriceUpdated(oldPrice, _price);
    }

    function toggleChainlink(bool _enabled) external onlyOwner {
        useChainlink = _enabled;
        emit ChainlinkToggled(_enabled);
    }
}
