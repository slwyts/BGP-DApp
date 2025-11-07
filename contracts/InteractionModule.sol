// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";
import "./AntiSybil.sol";

/**
 * @title InteractionModule
 * @dev 每日交互模块
 * - 每天2次交互机会（00:00 和 12:00 UTC）
 * - 每次交互需支付 0.6 ETH
 * - 每次交互奖励 2000 BGP
 * - 反日蚀攻击通过 AntiSybil 合约实现
 */
abstract contract InteractionModule is Ownable {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    function _getAntiSybil() internal view virtual returns (IAntiSybil);
    
    // 交互配置
    uint256 public constant INTERACTION_COST = 0.00015 ether; // 0.6 USDT (ETH @ $4000)
    uint256 public constant DAILY_BGP_REWARD = 2000 * 10**18;
    uint256 public constant SLOT_DURATION = 12 hours;
    
    // 用户交互数据
    struct DailyInteraction {
        uint256 lastInteractionDay;  // 最后交互的日期（天数）
        uint8 todayCount;             // 今日已交互次数 (0, 1, or 2)
        uint256 slot1Time;            // 00:00 时段交互时间
        uint256 slot2Time;            // 12:00 时段交互时间
        uint256 totalInteractions;    // 总交互次数
    }
    
    mapping(address => DailyInteraction) public userInteractions;
    
    // 交互奖励累积（待提现）
    mapping(address => uint256) public pendingInteractionBGP; // 待提现的交互BGP (18位精度)
    mapping(address => uint256) public totalInteractionBGPWithdrawn; // 已提现的交互BGP
    
    // 配置
    uint256 public constant MIN_WITHDRAW_BGP = 10000 * 10**18; // 最低提现 10000 BGP
    
    // 全局统计
    uint256 public totalInteractions;
    uint256 public totalParticipants;
    mapping(address => bool) public hasInteracted;
    
    event Interacted(
        address indexed user,
        uint256 reward,
        uint8 todayCount,
        uint256 totalCount,
        uint256 timestamp
    );
    event InteractionBGPWithdrawn(address indexed user, uint256 amount);
    
    /**
     * @dev 内部交互函数（被主合约调用）
     * @param user 交互用户
     * @param ipHash IP 地址哈希
     */
    function _interact(address user, bytes32 ipHash) internal {
        // 通过 AntiSybil 合约检查黑名单并注册地址
        IAntiSybil antiSybil = _getAntiSybil();
        require(!antiSybil.isBlacklisted(user), "Address is blacklisted");
        
        // 如果是首次交互，在 AntiSybil 中注册
        if (!hasInteracted[user]) {
            antiSybil.registerAddress(user, ipHash);
        }
        
        // 获取当前时段
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        
        DailyInteraction storage interaction = userInteractions[user];
        
        // 检查是否是新的一天
        if (interaction.lastInteractionDay < currentDay) {
            interaction.lastInteractionDay = currentDay;
            interaction.todayCount = 0;
            interaction.slot1Time = 0;
            interaction.slot2Time = 0;
        }
        
        // 验证交互次数
        require(interaction.todayCount < 2, "Daily limit reached");
        
        // 验证时段
        if (currentSlot == 1) {
            require(interaction.slot1Time == 0, "Slot 1 already claimed");
            interaction.slot1Time = block.timestamp;
        } else {
            require(interaction.slot2Time == 0, "Slot 2 already claimed");
            interaction.slot2Time = block.timestamp;
        }
        
        interaction.todayCount++;
        interaction.totalInteractions++;
        
        // 统计新用户
        if (!hasInteracted[user]) {
            hasInteracted[user] = true;
            totalParticipants++;
        }
        
        totalInteractions++;
        
        // 累积 BGP 奖励（不立即发放）
        pendingInteractionBGP[user] += DAILY_BGP_REWARD;
        
        emit Interacted(
            user,
            DAILY_BGP_REWARD,
            interaction.todayCount,
            interaction.totalInteractions,
            block.timestamp
        );
    }
    
    /**
     * @dev 提现交互奖励 BGP（累计达到 10000 BGP 才能提）
     */
    function withdrawInteractionBGP() external virtual {
        uint256 amount = pendingInteractionBGP[msg.sender];
        require(amount >= MIN_WITHDRAW_BGP, "Insufficient BGP balance");
        
        BGPToken bgpToken = _getBGPToken();
        require(bgpToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        // 清零待提现金额
        pendingInteractionBGP[msg.sender] = 0;
        totalInteractionBGPWithdrawn[msg.sender] += amount;
        
        // 转账
        require(bgpToken.transfer(msg.sender, amount), "BGP transfer failed");
        
        emit InteractionBGPWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev 获取当前时段
     */
    function _getCurrentSlot() internal view returns (uint256 currentDay, uint8 currentSlot) {
        currentDay = block.timestamp / 1 days;
        uint256 timeInDay = block.timestamp % 1 days;
        
        if (timeInDay < SLOT_DURATION) {
            currentSlot = 1; // 00:00 - 12:00
        } else {
            currentSlot = 2; // 12:00 - 24:00
        }
    }
    
    /**
     * @dev 检查用户是否可以交互
     */
    function checkInteractionStatus(address user)
        external
        view
        returns (
            bool canInteract,
            uint256 nextSlotTime,
            uint8 todayCount
        )
    {
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        DailyInteraction memory interaction = userInteractions[user];
        
        // 如果是新的一天，可以交互
        if (interaction.lastInteractionDay < currentDay) {
            canInteract = true;
            todayCount = 0;
            uint256 dayStart = currentDay * 1 days;
            nextSlotTime = currentSlot == 1 ? dayStart : dayStart + SLOT_DURATION;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        todayCount = interaction.todayCount;
        
        // 检查今日次数
        if (interaction.todayCount >= 2) {
            canInteract = false;
            nextSlotTime = (currentDay + 1) * 1 days;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        // 检查当前时段是否已交互
        if (currentSlot == 1 && interaction.slot1Time == 0) {
            canInteract = true;
            nextSlotTime = currentDay * 1 days;
        } else if (currentSlot == 2 && interaction.slot2Time == 0) {
            canInteract = true;
            nextSlotTime = currentDay * 1 days + SLOT_DURATION;
        } else {
            canInteract = false;
            if (currentSlot == 1) {
                nextSlotTime = currentDay * 1 days + SLOT_DURATION;
            } else {
                nextSlotTime = (currentDay + 1) * 1 days;
            }
        }
        
        return (canInteract, nextSlotTime, todayCount);
    }
    
    /**
     * @dev 获取用户今日交互次数
     */
    function getTodayInteractionCount(address user) external view returns (uint8) {
        (uint256 currentDay, ) = _getCurrentSlot();
        DailyInteraction memory interaction = userInteractions[user];
        
        if (interaction.lastInteractionDay < currentDay) {
            return 0;
        }
        
        return interaction.todayCount;
    }
    
    /**
     * @dev 获取用户总交互次数
     */
    function getTotalInteractionCount(address user) external view returns (uint256) {
        return userInteractions[user].totalInteractions;
    }
}
