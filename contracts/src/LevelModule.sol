// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    function _getUSDT() internal view virtual returns (IERC20);

    // 等级配置
    struct Level {
        uint256 requiredContribution; // 18位精度
        uint256 usdtReward;           // 6位精度
        uint256 bgpReward;            // 18位精度
    }
    
    Level[12] public levels;
    
    // 用户等级数据
    mapping(address => uint8) public userLevel; // 当前等级
    mapping(address => mapping(uint8 => bool)) public levelClaimed; // 是否领取过该等级奖励
    mapping(address => uint256) public pendingUSDT; // 待提现 USDT (6位精度)
    mapping(address => uint256) public totalUSDTWithdrawn; // 已提现 USDT (6位精度)
    mapping(address => uint256) public totalLevelBGP; // 等级奖励总 BGP (18位精度)
    
    // 配置
    uint256 public constant MIN_WITHDRAW_USDT = 10 * 10**6; // 最低提现 10 USDT (6位精度)
    
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
        // 贡献值 (18位), USDT奖励 (6位), BGP奖励 (18位)
        levels[0] = Level(10 * 10**18, 1 * 10**5, 200 * 10**18);           // V1: 10U, 0.1U, 200 BGP
        levels[1] = Level(50 * 10**18, 5 * 10**5, 200 * 10**18);           // V2: 50U, 0.5U, 200 BGP
        levels[2] = Level(100 * 10**18, 1 * 10**6, 200 * 10**18);          // V3: 100U, 1U, 200 BGP
        levels[3] = Level(500 * 10**18, 5 * 10**6, 2000 * 10**18);         // V4: 500U, 5U, 2000 BGP
        levels[4] = Level(3000 * 10**18, 20 * 10**6, 8000 * 10**18);       // V5: 3kU, 20U, 8k BGP
        levels[5] = Level(10000 * 10**18, 100 * 10**6, 10000 * 10**18);    // V6: 10kU, 100U, 10k BGP
        levels[6] = Level(30000 * 10**18, 200 * 10**6, 30000 * 10**18);    // V7: 30kU, 200U, 30k BGP
        levels[7] = Level(50000 * 10**18, 300 * 10**6, 50000 * 10**18);    // V8: 50kU, 300U, 50k BGP
        levels[8] = Level(100000 * 10**18, 500 * 10**6, 100000 * 10**18);  // V9: 100kU, 500U, 100k BGP
        levels[9] = Level(300000 * 10**18, 1000 * 10**6, 300000 * 10**18); // V10: 300kU, 1kU, 300k BGP
        levels[10] = Level(500000 * 10**18, 2000 * 10**6, 500000 * 10**18);// V11: 500kU, 2kU, 500k BGP
        levels[11] = Level(1000000 * 10**18, 10000 * 10**6, 1000000 * 10**18); // V12: 1M U, 10kU, 1M BGP
    }
    
    /**
     * @dev 检查并更新用户等级
     * @param user 用户地址
     * @param userContribution 用户当前贡献值 (18位精度)
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
        
        // 发放 BGP 奖励（使用 transfer 而不是 mint）
        require(
            _getBGPToken().transfer(msg.sender, levelData.bgpReward),
            "BGP transfer failed"
        );
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
        
        IERC20 usdt = _getUSDT();
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        // 清零待提现金额
        pendingUSDT[msg.sender] = 0;
        totalUSDTWithdrawn[msg.sender] += amount;
        
        // 转账
        require(usdt.transfer(msg.sender, amount), "USDT transfer failed");
        
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
