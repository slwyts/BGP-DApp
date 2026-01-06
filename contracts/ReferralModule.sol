// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BGPToken} from "./BGPToken.sol";
import {IAntiSybil} from "./AntiSybil.sol";
import {RewardHistoryModule} from "./RewardHistoryModule.sol";

/**
 * @title ReferralModule
 * @dev 推荐奖励模块
 * - 记录推荐关系（最多15代）
 * - 直推N人拿N代奖励
 * - 按层级分配 BGP 和贡献值
 */
abstract contract ReferralModule is Ownable, RewardHistoryModule {
    // 需要主合约提供这些函数
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getAntiSybil() internal view virtual returns (IAntiSybil);
    function _getTreasury() internal view virtual returns (address payable);
    
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
    mapping(address => uint256) public registeredAt; // 用户注册时间戳
    
    // 统计数据
    mapping(address => uint256) public pendingReferralBGP; // 待提现的推荐奖励 (BGP, 18位精度)
    mapping(address => uint256) public totalReferralBGPWithdrawn; // 已提现的推荐奖励 (BGP, 18位精度)
    mapping(address => uint256) public teamSize; // 团队总人数（包括所有代）
    
    // 早鸟奖励配置（前1万名注册用户）
    uint256 public totalRegistered; // 总注册人数
    uint256 public constant EARLY_BIRD_LIMIT = 10000; // 前1万名
    uint256 public constant EARLY_BIRD_REWARD = 5000 * 10**18; // 5000 BGP

    event Registered(
        address indexed user,
        address indexed referrer,
        bool isEarlyBird,
        uint256 bgpReward,
        uint256 registrationNumber
    );
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
     * @dev 用户注册并绑定推荐人（需支付注册费用）
     * @param _referrer 推荐人地址
     * @param ipAddr IP 地址（bytes16 格式，IPv4 转为 IPv6 映射地址）
     * @param timestamp 签名时间戳
     * @param signature 服务器签名
     */
    /**
     * @notice 内部注册函数（由主合约调用）
     * @param user 注册用户地址
     * @param _referrer 推荐人地址
     * @param ipAddr IP 地址（bytes16 格式，用于反女巫攻击）
     * @param timestamp 签名时间戳
     * @param signature 服务器对 (user, ipAddr, timestamp) 的签名
     */
    function _register(
        address user,
        address _referrer,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    ) internal {
        require(referrer[user] == address(0), "Already registered");
        
        // Owner 特殊处理：强制绑定到 0x0000000000000000000000000000000000000001
        address actualReferrer;
        if (user == owner()) {
            actualReferrer = address(1); // 0x0000000000000000000000000000000000000001
        } else {
            require(_referrer != user, "Cannot refer yourself");
            require(_referrer != address(0), "Invalid referrer");
            
            // 检查推荐人是否有资格（必须已绑定推荐人，owner 除外）
            if (_referrer != owner()) {
                require(referrer[_referrer] != address(0), "Referrer must be registered first");
            }
            
            actualReferrer = _referrer;
        }

        // 反女巫攻击检查（通过 AntiSybil 合约）
        IAntiSybil antiSybil = _getAntiSybil();
        require(!antiSybil.isBlacklisted(user), "Address is blacklisted");

        // 在 AntiSybil 中注册地址（包含签名验证）
        antiSybil.registerAddress(user, ipAddr, timestamp, signature);

        referrer[user] = actualReferrer;
        
        // 只有非 owner 才更新推荐人的直推列表和团队人数
        if (user != owner()) {
            directReferrals[actualReferrer].push(user);
            
            // 更新上级的团队人数（递归向上）
            address current = actualReferrer;
            for (uint8 i = 0; i < 15 && current != address(0) && current != address(1); i++) {
                teamSize[current]++;
                current = referrer[current];
            }
        }

        registeredAt[user] = block.timestamp; // 记录注册时间

        // 增加注册人数
        totalRegistered++;

        // 前1万名发放5000 BGP早鸟奖励
        bool isEarlyBird = totalRegistered <= EARLY_BIRD_LIMIT;
        uint256 bgpReward = isEarlyBird ? EARLY_BIRD_REWARD : 0;

        if (isEarlyBird) {
            require(
                _getBGPToken().transfer(user, EARLY_BIRD_REWARD),
                "Early bird reward transfer failed"
            );
            _recordReward(user, RewardCategory.EarlyBird, RewardToken.BGP, EARLY_BIRD_REWARD);
        }

        emit Registered(user, actualReferrer, isEarlyBird, bgpReward, totalRegistered);
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

                // 直接发放BGP到账户（修改：从累积到待提现改为直接转账）
                require(
                    _getBGPToken().transfer(current, reward.bgpAmount),
                    "BGP transfer failed"
                );

                _recordReward(current, RewardCategory.Referral, RewardToken.BGP, reward.bgpAmount);

                // 记录已发放的推荐奖励BGP（用于统计）
                totalReferralBGPWithdrawn[current] += reward.bgpAmount;

                // 增加贡献值
                contribution[current] += reward.contributionValue;

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
     * @dev 获取待提现的推荐BGP（供LevelModule使用）
     */
    function _getPendingReferralBGP(address user) internal view virtual returns (uint256) {
        return pendingReferralBGP[user];
    }
    
    /**
     * @dev 获取已提现的推荐BGP（供LevelModule使用）
     */
    function _getTotalReferralBGPWithdrawn(address user) internal view virtual returns (uint256) {
        return totalReferralBGPWithdrawn[user];
    }
    
    /**
     * @dev 清零待提现的推荐BGP（供LevelModule使用）
     */
    function _clearPendingReferralBGP(address user) internal virtual {
        uint256 amount = pendingReferralBGP[user];
        pendingReferralBGP[user] = 0;
        totalReferralBGPWithdrawn[user] += amount;
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
     * @dev 获取用户的直推列表及注册时间
     */
    function getDirectReferralsWithTime(address user)
        external
        view
        returns (address[] memory addresses, uint256[] memory timestamps)
    {
        address[] memory refs = directReferrals[user];
        uint256[] memory times = new uint256[](refs.length);

        for (uint256 i = 0; i < refs.length; i++) {
            times[i] = registeredAt[refs[i]];
        }

        return (refs, times);
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
