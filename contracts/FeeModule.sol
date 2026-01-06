// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title FeeModule
 * @dev 统一手续费管理模块
 * - 使用 Chainlink 预言机获取 ETH/USD 价格
 * - 计算最小手续费（0.6 USD）
 * - 支持主网和测试网
 */
abstract contract FeeModule is Ownable {
    // 需要主合约提供这个函数
    function _getTreasury() internal view virtual returns (address payable);

    // Chainlink ETH/USD Price Feed (Arbitrum Mainnet)
    address public constant CHAINLINK_ETH_USD_MAINNET = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    
    // 手续费配置
    uint256 public constant MIN_FEE_USD = 60; // 0.6 USD (用 60 表示，精度 2 位小数)
    uint256 public constant USD_PRECISION = 100; // 精度因子
    
    // 模拟价格（用于测试网）
    uint256 public simulatedEthPrice = 3500; // 默认 3500 USD
    
    // 是否使用 Chainlink (主网 true, 测试网 false)
    bool public useChainlink;
    
    event FeeCollected(address indexed user, uint256 amount, uint256 ethPrice);
    event SimulatedPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ChainlinkToggled(bool enabled);
    
    constructor() {
        // 检测是否在 Arbitrum 主网 (chainId 42161)
        useChainlink = block.chainid == 42161;
    }
    
    /**
     * @dev 获取当前 ETH/USD 价格
     * @return price ETH 价格（USD，8 位精度）
     */
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
                // Chainlink 返回 8 位精度的价格
                return uint256(answer);
            } catch {
                // 如果预言机调用失败，使用模拟价格
                return simulatedEthPrice * 10**8;
            }
        } else {
            // 测试网使用模拟价格
            return simulatedEthPrice * 10**8;
        }
    }
    
    /**
     * @dev 计算最小手续费（0.6 USD 等值的 ETH）
     * @return minFee 最小手续费（wei）
     */
    function getMinFee() public view returns (uint256 minFee) {
        uint256 ethPrice = getEthPrice(); // 8 位精度的 USD 价格
        
        // 计算: 0.6 USD = (0.6 * 10^18 * 10^8) / ethPrice
        // 简化: (60 * 10^18 * 10^8) / (100 * ethPrice)
        minFee = (MIN_FEE_USD * 10**18 * 10**8) / (USD_PRECISION * ethPrice);
        
        return minFee;
    }
    
    /**
     * @dev 验证并收取手续费
     * @param amount 实际支付的金额
     */
    function _collectFee(uint256 amount) internal {
        uint256 minFee = getMinFee();
        require(amount >= minFee, "Fee too low");
        
        uint256 ethPrice = getEthPrice();
        
        // 转账到 treasury
        (bool success, ) = _getTreasury().call{value: amount}("");
        require(success, "Fee transfer failed");
        
        emit FeeCollected(msg.sender, amount, ethPrice);
    }
    
    /**
     * @dev 设置模拟价格（仅 owner，仅测试网）
     */
    function setSimulatedPrice(uint256 _price) external onlyOwner {
        require(!useChainlink, "Cannot set price on mainnet");
        require(_price > 0, "Invalid price");
        
        uint256 oldPrice = simulatedEthPrice;
        simulatedEthPrice = _price;
        
        emit SimulatedPriceUpdated(oldPrice, _price);
    }
    
    /**
     * @dev 切换 Chainlink 使用状态（仅 owner，谨慎使用）
     */
    function toggleChainlink(bool _enabled) external onlyOwner {
        useChainlink = _enabled;
        emit ChainlinkToggled(_enabled);
    }
}
