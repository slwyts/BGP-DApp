// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";

/**
 * @title LevelModule
 * @dev 等级奖励模块
 * - 基于贡献值的等级系统（V1-V12）
 * - 达到等级自动解锁 BGP 和 USDT 奖励
 * - USDT 累计10U才能提现
 */
abstract contract LevelModule is Ownable {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    
    // 等级配置
    struct Level {
        uint256 requiredContribution;
        uint256 usdtReward;
        uint256 bgpReward;
    }
    
    Level[12] public levels;
    
    // 用户等级数据
    mapping(address => uint8) public userLevel; // 当前等级
    mapping(address => mapping(uint8 => bool)) public levelClaimed; // 是否领取过该等级奖励
    mapping(address => uint256) public pendingUSDT; // 待提现 USDT
    mapping(address => uint256) public totalUSDTWithdrawn; // 已提现 USDT
    mapping(address => uint256) public totalLevelBGP; // 等级奖励总 BGP
    
    // 配置
    uint256 public constant MIN_WITHDRAW_USDT = 10 ether; // 最低提现 10 USDT
    
    event LevelRewardClaimed(
        address indexed user,
        uint8 level,
        uint256 usdtAmount,
        uint256 bgpAmount
    );
    event USDTWithdrawn(address indexed user, uint256 amount);
    event LevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel);
    
    constructor() {
        // 初始化等级配置
        levels[0] = Level(10, 0.1 ether, 200 * 10**18);          // V1
        levels[1] = Level(50, 0.5 ether, 200 * 10**18);          // V2
        levels[2] = Level(100, 1 ether, 200 * 10**18);           // V3
        levels[3] = Level(500, 5 ether, 2000 * 10**18);          // V4
        levels[4] = Level(3000, 20 ether, 8000 * 10**18);        // V5
        levels[5] = Level(10000, 100 ether, 10000 * 10**18);     // V6
        levels[6] = Level(30000, 200 ether, 30000 * 10**18);     // V7
        levels[7] = Level(50000, 300 ether, 50000 * 10**18);     // V8
        levels[8] = Level(100000, 500 ether, 100000 * 10**18);   // V9
        levels[9] = Level(300000, 1000 ether, 300000 * 10**18);  // V10
        levels[10] = Level(500000, 2000 ether, 500000 * 10**18); // V11
        levels[11] = Level(1000000, 10000 ether, 1000000 * 10**18); // V12
    }
    
    /**
     * @dev 检查并更新用户等级
     * @param user 用户地址
     * @param userContribution 用户当前贡献值
     */
    function _updateUserLevel(address user, uint256 userContribution) internal {
        uint8 oldLevel = userLevel[user];
        uint8 newLevel = _calculateLevel(userContribution);
        
        if (newLevel > oldLevel) {
            userLevel[user] = newLevel;
            emit LevelUpdated(user, oldLevel, newLevel);
        }
    }
    
    /**
     * @dev 计算用户应该处于的等级
     */
    function _calculateLevel(uint256 userContribution) internal view returns (uint8) {
        for (uint8 i = 11; i >= 0; i--) {
            if (userContribution >= levels[i].requiredContribution) {
                return i + 1; // 等级从 1 开始
            }
            if (i == 0) break; // 防止 uint8 下溢
        }
        return 0; // 未达到 V1
    }
    
    /**
     * @dev 领取等级奖励
     * @param level 要领取的等级 (1-12)
     */
    function claimLevelReward(uint8 level) external {
        require(level >= 1 && level <= 12, "Invalid level");
        require(userLevel[msg.sender] >= level, "Level not reached");
        require(!levelClaimed[msg.sender][level], "Already claimed");
        
        Level memory levelData = levels[level - 1];
        
        // 标记已领取
        levelClaimed[msg.sender][level] = true;
        
        // 发放 BGP 奖励
        _getBGPToken().mint(msg.sender, levelData.bgpReward);
        totalLevelBGP[msg.sender] += levelData.bgpReward;
        
        // 累积 USDT（不立即发放）
        pendingUSDT[msg.sender] += levelData.usdtReward;
        
        emit LevelRewardClaimed(
            msg.sender,
            level,
            levelData.usdtReward,
            levelData.bgpReward
        );
    }
    
    /**
     * @dev 提现 USDT（累计达到 10U 才能提）
     */
    function withdrawUSDT() external {
        uint256 amount = pendingUSDT[msg.sender];
        require(amount >= MIN_WITHDRAW_USDT, "Insufficient USDT balance");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // 清零待提现金额
        pendingUSDT[msg.sender] = 0;
        totalUSDTWithdrawn[msg.sender] += amount;
        
        // 转账
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit USDTWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev 获取用户当前等级
     */
    function getCurrentLevel(address user) external view returns (uint8) {
        return userLevel[user];
    }
    
    /**
     * @dev 检查用户是否可以领取某等级奖励
     */
    function canClaimLevel(address user, uint8 level) external view returns (bool) {
        if (level < 1 || level > 12) return false;
        if (userLevel[user] < level) return false;
        if (levelClaimed[user][level]) return false;
        return true;
    }
    
    /**
     * @dev 获取用户所有等级的领取状态
     */
    function getLevelClaimStatus(address user) 
        external 
        view 
        returns (bool[12] memory claimed) 
    {
        for (uint8 i = 1; i <= 12; i++) {
            claimed[i - 1] = levelClaimed[user][i];
        }
    }
    
    /**
     * @dev 获取用户可领取的等级列表
     */
    function getClaimableLevels(address user) external view returns (uint8[] memory) {
        uint8 currentLevel = userLevel[user];
        uint8[] memory temp = new uint8[](12);
        uint8 count = 0;
        
        for (uint8 i = 1; i <= currentLevel && i <= 12; i++) {
            if (!levelClaimed[user][i]) {
                temp[count] = i;
                count++;
            }
        }
        
        // 返回实际长度的数组
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /**
     * @dev 获取等级信息
     */
    function getLevelInfo(uint8 level) 
        external 
        view 
        returns (
            uint256 requiredContribution,
            uint256 usdtReward,
            uint256 bgpReward
        ) 
    {
        require(level >= 1 && level <= 12, "Invalid level");
        Level memory levelData = levels[level - 1];
        return (
            levelData.requiredContribution,
            levelData.usdtReward,
            levelData.bgpReward
        );
    }
}
