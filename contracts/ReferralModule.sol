// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";
import "./AntiSybil.sol";

/**
 * @title ReferralModule
 * @dev 推荐奖励模块
 * - 记录推荐关系（最多15代）
 * - 直推N人拿N代奖励
 * - 按层级分配 BGP 和贡献值
 */
abstract contract ReferralModule is Ownable {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _addPendingInteractionBGP(address user, uint256 amount) internal virtual;
    function _getAntiSybil() internal view virtual returns (IAntiSybil);
    
    // 推荐奖励配置
    struct ReferralReward {
        uint256 bgpAmount;         // BGP数量，18位精度
        uint256 contributionValue; // 贡献值，整数（不带小数）
    }
    
    // L1-L15 的奖励配置
    mapping(uint8 => ReferralReward) public levelRewards;
    
    // 推荐关系
    mapping(address => address) public referrer; // 用户 -> 推荐人
    mapping(address => address[]) public directReferrals; // 直推列表
    mapping(address => uint256) public contribution; // 贡献值（整数）
    
    // 统计数据
    mapping(address => uint256) public totalReferralRewards; // 总推荐奖励 (BGP, 18位精度)
    mapping(address => uint256) public teamSize; // 团队总人数（包括所有代）
    
    // 早鸟奖励配置（前1万名注册用户）
    uint256 public totalRegistered; // 总注册人数
    uint256 public constant EARLY_BIRD_LIMIT = 10000; // 前1万名
    uint256 public constant EARLY_BIRD_REWARD = 5000 * 10**18; // 5000 BGP
    mapping(address => bool) public hasClaimedEarlyBird; // 是否已领取早鸟奖励
    
    event Registered(address indexed user, address indexed referrer);
    event EarlyBirdRewardClaimed(address indexed user, uint256 amount, uint256 registrationNumber);
    event ReferralRewardDistributed(
        address indexed referrer,
        address indexed user,
        uint8 level,
        uint256 bgpAmount,
        uint256 contribution
    );
    
    constructor() {
        // 初始化推荐奖励配置
        // 根据 README: L1=8U, L2=4U, L3=2U, L4-15=1U 贡献值
        // BGP奖励 (18位精度), 贡献值 (整数，不带精度)
        levelRewards[1] = ReferralReward(800 * 10**18, 8); // L1: 800 BGP, 8 贡献值
        levelRewards[2] = ReferralReward(400 * 10**18, 4); // L2: 400 BGP, 4 贡献值
        levelRewards[3] = ReferralReward(200 * 10**18, 2); // L3: 200 BGP, 2 贡献值
        // L4-L15 都是 100 BGP, 1 贡献值
        for (uint8 i = 4; i <= 15; i++) {
            levelRewards[i] = ReferralReward(100 * 10**18, 1);
        }
    }
    
    /**
     * @dev 用户注册并绑定推荐人
     * @param _referrer 推荐人地址
     * @param ipHash IP 地址的哈希值
     */
    function register(address _referrer, bytes32 ipHash) external {
        require(referrer[msg.sender] == address(0), "Already registered");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(_referrer != address(0), "Invalid referrer");

        // 检查推荐人是否有资格（必须已绑定推荐人，owner 除外）
        if (_referrer != owner()) {
            require(referrer[_referrer] != address(0), "Referrer must be registered first");
        }

        // 反女巫攻击检查（通过 AntiSybil 合约）
        IAntiSybil antiSybil = _getAntiSybil();
        require(!antiSybil.isBlacklisted(msg.sender), "Address is blacklisted");

        // 在 AntiSybil 中注册地址
        antiSybil.registerAddress(msg.sender, ipHash);

        referrer[msg.sender] = _referrer;
        directReferrals[_referrer].push(msg.sender);

        // 更新上级的团队人数（递归向上）
        address current = _referrer;
        for (uint8 i = 0; i < 15 && current != address(0); i++) {
            teamSize[current]++;
            current = referrer[current];
        }

        // 增加注册人数
        totalRegistered++;

        // 前1万名发放5000 BGP早鸟奖励（直接转账）
        if (totalRegistered <= EARLY_BIRD_LIMIT) {
            hasClaimedEarlyBird[msg.sender] = true;
            require(
                _getBGPToken().transfer(msg.sender, EARLY_BIRD_REWARD),
                "Early bird reward transfer failed"
            );
            emit EarlyBirdRewardClaimed(msg.sender, EARLY_BIRD_REWARD, totalRegistered);
        }

        emit Registered(msg.sender, _referrer);
    }
    
    /**
     * @dev 分发推荐奖励
     * @param user 交互用户
     */
    function _distributeReferralRewards(address user) internal {
        address current = referrer[user];
        
        for (uint8 level = 1; level <= 15 && current != address(0); level++) {
            // 检查是否有足够的直推人数来获得该层级的奖励
            uint256 directCount = directReferrals[current].length;
            
            // 直推N人拿N代
            if (directCount >= level) {
                ReferralReward memory reward = levelRewards[level];
                
                // 发放 BGP 奖励（使用 transfer 而不是 mint）
                require(
                    _getBGPToken().transfer(current, reward.bgpAmount),
                    "BGP transfer failed"
                );
                
                // 增加贡献值
                contribution[current] += reward.contributionValue;
                
                // 统计总奖励
                totalReferralRewards[current] += reward.bgpAmount;
                
                emit ReferralRewardDistributed(
                    current,
                    user,
                    level,
                    reward.bgpAmount,
                    reward.contributionValue
                );
            }
            
            // 向上查找下一级推荐人
            current = referrer[current];
        }
    }
    
    /**
     * @dev [仅限Owner] 设置用户的贡献值（主要用于测试或数据迁移）
     */
    function setContribution(address user, uint256 value) external onlyOwner {
        contribution[user] = value;
    }
    
    /**
     * @dev 获取用户的直推列表
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }
    
    /**
     * @dev 获取用户的直推人数
     */
    function getDirectReferralCount(address user) external view returns (uint256) {
        return directReferrals[user].length;
    }
    
    /**
     * @dev 获取用户的团队总人数
     */
    function getTeamSize(address user) external view returns (uint256) {
        return teamSize[user];
    }
    
    /**
     * @dev 获取用户的推荐路径（从用户到顶层）
     */
    function getReferralPath(address user) external view returns (address[] memory) {
        address[] memory path = new address[](15);
        address current = referrer[user];
        uint256 count = 0;
        
        for (uint8 i = 0; i < 15 && current != address(0); i++) {
            path[count] = current;
            count++;
            current = referrer[current];
        }
        
        // 返回实际长度的数组
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = path[i];
        }
        
        return result;
    }
}
