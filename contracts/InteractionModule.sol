// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";
import "./RewardHistoryModule.sol";

/**
 * @title InteractionModule
 * @dev 每日交互模块
 * - 每天2次交互机会（00:00 和 12:00 UTC）
 * - 每次交互需支付 0.6U ETH
 * - 每次交互奖励 2000 BGP
 */
abstract contract InteractionModule is Ownable, RewardHistoryModule {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    
    // 交互配置
    uint256 public constant INTERACTION_COST = 0.00018 ether; // 0.63 USDT (ETH @ $3500)
    uint256 public constant DAILY_BGP_REWARD = 2000 * 10**18; // 每次2000 BGP
    uint256 public constant SLOT_DURATION = 12 hours;
    uint256 public constant TIMEZONE_OFFSET = 8 hours; // UTC+8 时区偏移
    
    // 用户交互数据
    struct DailyInteraction {
        uint256 lastInteractionDay;  // 最后交互的日期（天数）
        uint8 todayCount;             // 今日已交互次数 (0, 1, or 2)
        uint256 slot1Time;            // 00:00 时段交互时间
        uint256 slot2Time;            // 12:00 时段交互时间
        uint256 totalInteractions;    // 总交互次数
    }
    
    mapping(address => DailyInteraction) public userInteractions;

    // 交互奖励统计
    mapping(address => uint256) public totalInteractionBGP; // 总共获得的交互BGP (18位精度)
    
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
    
    /**
     * @dev 内部交互函数（被主合约调用）
     * @param user 交互用户
     */
    function _interact(address user) internal {
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

        // 发放 BGP 奖励（直接转账）
        require(
            _getBGPToken().transfer(user, DAILY_BGP_REWARD),
            "BGP transfer failed"
        );
        totalInteractionBGP[user] += DAILY_BGP_REWARD;

        _recordReward(user, RewardCategory.Interaction, RewardToken.BGP, DAILY_BGP_REWARD);

        emit Interacted(
            user,
            DAILY_BGP_REWARD,
            interaction.todayCount,
            interaction.totalInteractions,
            block.timestamp
        );
    }

    /**
     * @dev 获取当前时段（UTC+8 时区）
     */
    function _getCurrentSlot() internal view returns (uint256 currentDay, uint8 currentSlot) {
        // 将 UTC 时间转换为 UTC+8
        uint256 adjustedTimestamp = block.timestamp + TIMEZONE_OFFSET;
        
        currentDay = adjustedTimestamp / 1 days;
        uint256 timeInDay = adjustedTimestamp % 1 days;
        
        if (timeInDay < SLOT_DURATION) {
            currentSlot = 1; // 00:00 - 12:00 (UTC+8)
        } else {
            currentSlot = 2; // 12:00 - 24:00 (UTC+8)
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
        
        // 计算 UTC+8 时区的当天 00:00 时间戳（UTC 时间）
        // 步骤：
        // 1. 将当前 UTC 时间转为 UTC+8
        // 2. 计算 UTC+8 当天的 00:00（以天数计算）
        // 3. 减去偏移量，得到对应的 UTC 时间戳
        uint256 adjustedTimestamp = block.timestamp + TIMEZONE_OFFSET;
        uint256 daysSinceEpoch = adjustedTimestamp / 1 days;
        uint256 dayStartTimestamp = (daysSinceEpoch * 1 days) - TIMEZONE_OFFSET;
        
        // 如果是新的一天，可以交互
        if (interaction.lastInteractionDay < currentDay) {
            canInteract = true;
            todayCount = 0;
            nextSlotTime = currentSlot == 1 ? dayStartTimestamp : dayStartTimestamp + SLOT_DURATION;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        todayCount = interaction.todayCount;
        
        // 检查今日次数
        if (interaction.todayCount >= 2) {
            canInteract = false;
            nextSlotTime = dayStartTimestamp + 1 days; // 明天 00:00 (UTC+8)
            return (canInteract, nextSlotTime, todayCount);
        }
        
        // 检查当前时段是否已交互
        if (currentSlot == 1 && interaction.slot1Time == 0) {
            // 在第一时段，且第一时段未交互
            canInteract = true;
            nextSlotTime = dayStartTimestamp; // 当前时段开始时间（已经过了，但用于显示）
        } else if (currentSlot == 2 && interaction.slot2Time == 0) {
            // 在第二时段，且第二时段未交互
            canInteract = true;
            nextSlotTime = dayStartTimestamp + SLOT_DURATION; // 第二时段开始时间（已经过了，但用于显示）
        } else {
            // 当前时段已交互，不能再交互
            canInteract = false;
            if (currentSlot == 1 && interaction.slot1Time != 0 && interaction.slot2Time == 0) {
                // 第一时段已交互，第二时段未交互 → 下次是今天 12:00
                nextSlotTime = dayStartTimestamp + SLOT_DURATION;
            } else {
                // 其他情况（两个时段都交互了，或在第二时段已交互）→ 下次是明天 00:00
                nextSlotTime = dayStartTimestamp + 1 days;
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
