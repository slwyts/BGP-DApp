// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BGPToken.sol";

/**
 * @title ReferralModule
 * @dev 推荐奖励模块
 * - 记录推荐关系（最多15代）
 * - 直推N人拿N代奖励
 * - 按层级分配 BGP 和贡献值
 */
abstract contract ReferralModule is Ownable {
    // 需要主合约提供这个函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    
    // 推荐奖励配置
    struct ReferralReward {
        uint256 bgpAmount;         // 18位精度
        uint256 contributionValue; // 6位精度
    }
    
    // L1-L15 的奖励配置
    mapping(uint8 => ReferralReward) public levelRewards;
    
    // 推荐关系
    mapping(address => address) public referrer; // 用户 -> 推荐人
    mapping(address => address[]) public directReferrals; // 直推列表
    mapping(address => uint256) public contribution; // 贡献值 (18位精度, 对应USDT价值)
    
    // 统计数据
    mapping(address => uint256) public totalReferralRewards; // 总推荐奖励 (BGP, 18位精度)
    mapping(address => uint256) public teamSize; // 团队总人数（包括所有代）
    
    event Registered(address indexed user, address indexed referrer);
    event ReferralRewardDistributed(
        address indexed referrer,
        address indexed user,
        uint8 level,
        uint256 bgpAmount,
        uint256 contribution
    );
    
    constructor() {
        // 初始化推荐奖励配置
        // BGP 价格 0.00175 USDT, 所以:
        // 800 BGP = 1.4 USDT
        // 400 BGP = 0.7 USDT  
        // 200 BGP = 0.35 USDT
        // 100 BGP = 0.175 USDT
        // BGP奖励 (18位), 贡献值 (18位, 模拟USDT价值)
        levelRewards[1] = ReferralReward(800 * 10**18, 14 * 10**17); // 1.4 USDT
        levelRewards[2] = ReferralReward(400 * 10**18, 7 * 10**17);  // 0.7 USDT
        levelRewards[3] = ReferralReward(200 * 10**18, 35 * 10**16); // 0.35 USDT
        // L4-L15 都是 100 BGP, 0.175 USDT 贡献值
        for (uint8 i = 4; i <= 15; i++) {
            levelRewards[i] = ReferralReward(100 * 10**18, 175 * 10**15); // 0.175 USDT
        }
    }
    
    /**
     * @dev 用户注册并绑定推荐人
     * @param _referrer 推荐人地址
     */
    function register(address _referrer) external {
        require(referrer[msg.sender] == address(0), "Already registered");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(_referrer != address(0), "Invalid referrer");
        
        referrer[msg.sender] = _referrer;
        directReferrals[_referrer].push(msg.sender);
        
        // 更新上级的团队人数（递归向上）
        address current = _referrer;
        for (uint8 i = 0; i < 15 && current != address(0); i++) {
            teamSize[current]++;
            current = referrer[current];
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
                
                // 发放 BGP 奖励
                _getBGPToken().mint(current, reward.bgpAmount);
                
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
