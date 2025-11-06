// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BGPToken.sol";

/**
 * @title AirdropInteraction
 * @dev 每日空投交互合约
 * - 每天2次交互机会（00:00 和 12:00 UTC）
 * - 每次交互需支付 0.6 ETH（gas 费）
 * - 每次交互奖励 2000 BGP
 * - 反日蚀攻击：每个 IP 限制 15 个地址
 */
contract AirdropInteraction is Ownable, ReentrancyGuard, Pausable {
    BGPToken public bgpToken;
    
    // 交互配置
    uint256 public constant INTERACTION_COST = 0.6 ether;
    uint256 public constant DAILY_BGP_REWARD = 2000 * 10**18;
    uint256 public constant MAX_ADDRESSES_PER_IP = 15;
    uint256 public constant SLOT_DURATION = 12 hours;
    
    // 用户交互数据
    struct DailyInteraction {
        uint256 lastInteractionDay;  // 最后交互的日期（天数）
        uint8 todayCount;             // 今日已交互次数 (0, 1, or 2)
        uint256 slot1Time;            // 00:00 时段交互时间
        uint256 slot2Time;            // 12:00 时段交互时间
    }
    
    mapping(address => DailyInteraction) public userInteractions;
    mapping(bytes32 => address[]) public ipAddresses; // IP hash -> 地址列表
    
    // 统计数据
    uint256 public totalInteractions;
    uint256 public totalParticipants;
    mapping(address => bool) public hasInteracted;
    
    // 资金接收地址
    address public treasury;
    
    // 推荐合约地址（用于触发推荐奖励）
    address public referralContract;
    
    event Interacted(
        address indexed user, 
        uint256 reward, 
        uint8 todayCount,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ReferralContractUpdated(address indexed newContract);
    
    constructor(
        address _bgpToken,
        address _treasury
    ) Ownable(msg.sender) {
        require(_bgpToken != address(0), "Invalid token address");
        require(_treasury != address(0), "Invalid treasury address");
        
        bgpToken = BGPToken(_bgpToken);
        treasury = _treasury;
    }
    
    /**
     * @dev 用户交互函数
     * @param ipHash IP地址的哈希值（前端计算后传入，保护隐私）
     */
    function interact(bytes32 ipHash) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(msg.value >= INTERACTION_COST, "Insufficient payment");
        
        // 验证 IP 限制
        _checkIPLimit(msg.sender, ipHash);
        
        // 获取当前时段
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        
        DailyInteraction storage interaction = userInteractions[msg.sender];
        
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
        
        // 统计新用户
        if (!hasInteracted[msg.sender]) {
            hasInteracted[msg.sender] = true;
            totalParticipants++;
        }
        
        totalInteractions++;
        
        // 转账 gas 费到 treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Transfer failed");
        
        // 发放 BGP 奖励（使用 transfer 而不是 mint）
        require(bgpToken.transfer(msg.sender, DAILY_BGP_REWARD), "BGP transfer failed");
        
        // 触发推荐奖励（如果设置了推荐合约）
        if (referralContract != address(0)) {
            (bool refSuccess, ) = referralContract.call(
                abi.encodeWithSignature("distributeReferralRewards(address)", msg.sender)
            );
            // 推荐奖励失败不影响主流程
            require(refSuccess, "Referral distribution failed");
        }
        
        emit Interacted(msg.sender, DAILY_BGP_REWARD, interaction.todayCount, block.timestamp);
    }
    
    /**
     * @dev 检查 IP 限制
     */
    function _checkIPLimit(address user, bytes32 ipHash) internal {
        address[] storage addresses = ipAddresses[ipHash];
        
        // 检查是否已存在
        bool exists = false;
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == user) {
                exists = true;
                break;
            }
        }
        
        // 如果不存在，添加并检查数量
        if (!exists) {
            require(addresses.length < MAX_ADDRESSES_PER_IP, "IP address limit exceeded");
            addresses.push(user);
        }
    }
    
    /**
     * @dev 获取当前时段
     * @return currentDay 当前天数
     * @return currentSlot 当前时段 (1 或 2)
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
     * @return canInteract 是否可以交互
     * @return nextSlotTime 下一个可用时段的时间戳
     */
    function checkInteractionStatus(address user) 
        external 
        view 
        returns (bool canInteract, uint256 nextSlotTime, uint8 todayCount) 
    {
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        DailyInteraction memory interaction = userInteractions[user];
        
        // 如果是新的一天，可以交互
        if (interaction.lastInteractionDay < currentDay) {
            canInteract = true;
            todayCount = 0;
            // 计算当前时段开始时间
            uint256 dayStart = currentDay * 1 days;
            nextSlotTime = currentSlot == 1 ? dayStart : dayStart + SLOT_DURATION;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        todayCount = interaction.todayCount;
        
        // 检查今日次数
        if (interaction.todayCount >= 2) {
            canInteract = false;
            // 下一个可用时段是明天 00:00
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
            // 下一个时段
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
     * @dev 获取 IP 地址关联的所有地址
     */
    function getIPAddresses(bytes32 ipHash) external view returns (address[] memory) {
        return ipAddresses[ipHash];
    }
    
    /**
     * @dev 设置 treasury 地址
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @dev 设置推荐合约地址
     */
    function setReferralContract(address _referralContract) external onlyOwner {
        referralContract = _referralContract;
        emit ReferralContractUpdated(_referralContract);
    }
    
    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 紧急提取（仅在紧急情况下使用）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
