// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";

/**
 * @title InteractionModule
 * @dev 每日交互模块
 * - 每天2次交互机会（00:00 和 12:00 UTC）
 * - 每次交互需支付 0.6 ETH
 * - 每次交互奖励 2000 BGP
 * - 反日蚀攻击：每个 IP 限制 15 个地址
 */
abstract contract InteractionModule is Ownable {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    
    // 交互配置
    uint256 public constant INTERACTION_COST = 0.00018 ether; // ~$0.72 (ETH @ $4000)
    uint256 public constant DAILY_BGP_REWARD = 2000 * 10**18;
    uint256 public constant MAX_ADDRESSES_PER_IP = 15;
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
    mapping(bytes32 => address[]) public ipAddresses; // IP hash -> 地址列表
    
    // 全局统计
    uint256 public totalInteractions;
    uint256 public totalParticipants;
    mapping(address => bool) public hasInteracted;
    
    // 黑名单系统
    mapping(address => bool) public isBlacklisted;
    mapping(bytes32 => bool) public ipBlacklisted; // IP 是否被封禁
    
    event Interacted(
        address indexed user,
        uint256 reward,
        uint8 todayCount,
        uint256 totalCount,
        uint256 timestamp
    );
    
    event AddressBlacklisted(address indexed user, bytes32 indexed ipHash, string reason);
    event IPBlacklisted(bytes32 indexed ipHash, uint256 addressCount);
    
    /**
     * @dev 内部交互函数（被主合约调用）
     * @param user 交互用户
     * @param ipHash IP 地址哈希
     */
    function _interact(address user, bytes32 ipHash) internal {
        // 验证 IP 限制
        _checkIPLimit(user, ipHash);
        
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
        
        // 发放 BGP 奖励
        _getBGPToken().mint(user, DAILY_BGP_REWARD);
        
        emit Interacted(
            user,
            DAILY_BGP_REWARD,
            interaction.todayCount,
            interaction.totalInteractions,
            block.timestamp
        );
    }
    
    /**
     * @dev 检查 IP 限制，超限则封禁所有地址
     */
    function _checkIPLimit(address user, bytes32 ipHash) internal {
        // 检查用户是否已被封禁
        require(!isBlacklisted[user], "Address is blacklisted");
        
        // 检查 IP 是否已被封禁
        require(!ipBlacklisted[ipHash], "IP is blacklisted");
        
        address[] storage addresses = ipAddresses[ipHash];
        
        // 检查是否已存在
        bool exists = false;
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == user) {
                exists = true;
                break;
            }
        }
        
        // 如果不存在，添加新地址
        if (!exists) {
            // 如果已经达到限制，拒绝添加
            if (addresses.length >= MAX_ADDRESSES_PER_IP) {
                revert("IP limit exceeded - all addresses blacklisted");
            }
            addresses.push(user);
            
            // 如果添加后正好达到限制，立即封禁
            if (addresses.length == MAX_ADDRESSES_PER_IP) {
                _blacklistIP(ipHash);
            }
        }
    }
    
    /**
     * @dev 封禁 IP 及其所有关联地址
     */
    function _blacklistIP(bytes32 ipHash) internal {
        address[] storage addresses = ipAddresses[ipHash];
        
        // 标记 IP 为封禁
        ipBlacklisted[ipHash] = true;
        
        // 封禁所有关联地址
        for (uint256 i = 0; i < addresses.length; i++) {
            address addr = addresses[i];
            if (!isBlacklisted[addr]) {
                isBlacklisted[addr] = true;
                emit AddressBlacklisted(addr, ipHash, "IP limit exceeded");
            }
        }
        
        emit IPBlacklisted(ipHash, addresses.length);
    }
    
    /**
     * @dev 手动封禁地址（仅 owner）
     */
    function blacklistAddress(address user, string calldata reason) external onlyOwner {
        require(!isBlacklisted[user], "Already blacklisted");
        isBlacklisted[user] = true;
        emit AddressBlacklisted(user, bytes32(0), reason);
    }
    
    /**
     * @dev 解除封禁（仅 owner，用于误封的情况）
     */
    function removeFromBlacklist(address user) external onlyOwner {
        require(isBlacklisted[user], "Not blacklisted");
        isBlacklisted[user] = false;
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
    
    /**
     * @dev 获取 IP 地址关联的所有地址
     */
    function getIPAddresses(bytes32 ipHash) external view returns (address[] memory) {
        return ipAddresses[ipHash];
    }
}
