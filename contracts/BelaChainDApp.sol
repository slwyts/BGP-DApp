// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./BGPToken.sol";
import "./AntiSybil.sol";
import "./ReferralModule.sol";
import "./LevelModule.sol";
import "./InteractionModule.sol";
import "./FeeModule.sol";

/**
 * @title BelaChainDApp
 * @dev BelaChain 生态 DApp 主合约
 * 整合了所有功能模块：
 * - 推荐奖励系统
 * - 等级奖励系统
 * - 每日交互系统
 * - AntiSybil 防女巫攻击系统
 * - 动态手续费系统（Chainlink 预言机）
 * 
 * 单一合约部署，便于管理和维护
 */
contract BelaChainDApp is 
    ReferralModule,
    LevelModule,
    InteractionModule,
    FeeModule,
    ReentrancyGuard,
    Pausable
{
    // 共享变量（被所有模块使用）
    BGPToken public bgpToken;
    IERC20 public usdtToken;
    address payable public treasury;
    
    // 版本信息
    string public constant VERSION = "2.0.0"; // 升级版本号 - 集成 AntiSybil
    
    // 是否启用自动等级检查（每次交互后检查等级）
    bool public autoLevelCheck = true;
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AutoLevelCheckUpdated(bool enabled);

    /**
     * @dev 构造函数
     * @param _bgpToken BGP 代币合约地址（包含 AntiSybil 引用）
     * @param _usdtToken USDT 代币合约地址
     */
    constructor(
        address _bgpToken,
        address _usdtToken
    ) Ownable(msg.sender) {
        require(_bgpToken != address(0), "Invalid BGP token address");
        require(_usdtToken != address(0), "Invalid USDT token address");

        bgpToken = BGPToken(_bgpToken);
        usdtToken = IERC20(_usdtToken);
        treasury = payable(msg.sender); // Treasury 就是 owner
    }
    
    /**
     * @dev 实现虚函数：获取 BGP Token
     */
    function _getBGPToken() internal view override(ReferralModule, LevelModule, InteractionModule) returns (BGPToken) {
        return bgpToken;
    }

    /**
     * @dev 实现虚函数：获取 Treasury
     */
    function _getTreasury() internal view override(ReferralModule, LevelModule, InteractionModule, FeeModule) returns (address payable) {
        return treasury;
    }

    /**
     * @dev 实现虚函数：获取 USDT Token
     */
    function _getUSDT() internal view override(LevelModule) returns (IERC20) {
        return usdtToken;
    }

    /**
     * @dev 实现虚函数：获取 AntiSybil 合约（从 BGPToken 获取）
     */
    function _getAntiSybil() internal view override(ReferralModule) returns (IAntiSybil) {
        return bgpToken.antiSybilContract();
    }
    
    /**
     * @dev 实现虚函数：获取待提现的推荐BGP（供LevelModule使用）
     */
    function _getPendingReferralBGP(address user) internal view override(LevelModule, ReferralModule) returns (uint256) {
        return pendingReferralBGP[user];
    }
    
    /**
     * @dev 实现虚函数：获取已提现的推荐BGP（供LevelModule使用）
     */
    function _getTotalReferralBGPWithdrawn(address user) internal view override(LevelModule, ReferralModule) returns (uint256) {
        return totalReferralBGPWithdrawn[user];
    }
    
    /**
     * @dev 实现虚函数：清零待提现的推荐BGP（供LevelModule使用）
     */
    function _clearPendingReferralBGP(address user) internal override(LevelModule, ReferralModule) {
        uint256 amount = pendingReferralBGP[user];
        pendingReferralBGP[user] = 0;
        totalReferralBGPWithdrawn[user] += amount;
    }
    
    /**
     * @dev 实现虚函数：获取贡献值（供LevelModule使用）
     */
    function _getContribution(address user) internal view override returns (uint256) {
        return contribution[user];
    }
    
    /**
     * @dev 用户交互主函数
     */
    function interact()
        external
        payable
        nonReentrant
        whenNotPaused
    {
        uint256 minFee = getMinFee();
        require(msg.value >= minFee, "Insufficient payment");

        // 0. 检查用户是否已绑定推荐人（所有人都必须绑定）
        require(referrer[msg.sender] != address(0), "Must register with a referrer first");

        // 1. 收取手续费
        _collectFee(minFee);

        // 2. 执行交互（发放 BGP 奖励）
        InteractionModule._interact(msg.sender);

        // 3. 分发推荐奖励（如果用户有推荐人）
        if (referrer[msg.sender] != address(0)) {
            ReferralModule._distributeReferralRewards(msg.sender);
        }

        // 4. 检查并更新等级（如果启用）
        if (autoLevelCheck) {
            LevelModule._updateUserLevel(msg.sender, contribution[msg.sender]);
        }
    }
    
    /**
     * @dev 用户注册函数（重写以使用动态手续费）
     */
    function register(address _referrer, bytes32 ipHash) external payable {
        uint256 minFee = getMinFee();
        require(msg.value >= minFee, "Insufficient payment");
        
        // 收取手续费
        _collectFee(minFee);
        
        // 记录注册前的状态，用于判断是否获得早鸟奖励
        uint256 registrationNumber = totalRegistered + 1;
        bool willGetEarlyBird = registrationNumber <= EARLY_BIRD_LIMIT;
        
        // 调用父合约的内部注册逻辑
        ReferralModule._register(msg.sender, _referrer, ipHash);
        
        // 如果获得了早鸟奖励（5000 BGP），统计到 totalInteractionBGP
        if (willGetEarlyBird) {
            totalInteractionBGP[msg.sender] += EARLY_BIRD_REWARD;
        }
        
        // 注册后给上级分发推荐奖励（与空投一次相同的奖励）
        if (referrer[msg.sender] != address(0) && referrer[msg.sender] != address(1)) {
            ReferralModule._distributeReferralRewards(msg.sender);
        }
    }
    
    /**
     * @dev 手动更新用户等级（如果禁用了自动检查）
     */
    function updateLevel() external {
        LevelModule._updateUserLevel(msg.sender, contribution[msg.sender]);
    }
    
    /**
     * @dev 批量更新多个用户的等级（仅 owner）
     */
    function batchUpdateLevels(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            LevelModule._updateUserLevel(users[i], contribution[users[i]]);
        }
    }
    
    /**
     * @dev 获取用户完整信息
     */
    function getUserInfo(address user)
        external
        view
        returns (
            // 推荐信息
            address userReferrer,
            uint256 directReferralCount,
            uint256 userTeamSize,
            uint256 userContribution,
            uint256 userPendingLevelBGP,        // 改：等级奖励待提现BGP
            uint256 userTotalReferralBGPWithdrawn,  // 推荐奖励已发放BGP（直接到账）
            // 等级信息
            uint8 currentLevel,
            uint256 userPendingUSDT,
            uint256 userTotalUSDTWithdrawn,
            uint256 userTotalLevelBGP,          // 等级奖励已提现BGP
            // 交互信息
            uint8 todayInteractionCount,
            uint256 totalInteractionCount,
            uint256 userTotalInteractionBGP
        )
    {
        return (
            // 推荐信息
            referrer[user],
            directReferrals[user].length,
            teamSize[user],
            contribution[user],
            pendingLevelBGP[user],              // 改：返回等级奖励待提现BGP
            totalReferralBGPWithdrawn[user],    // 推荐奖励总发放（直接到账）
            // 等级信息
            userLevel[user],
            pendingUSDT[user],
            totalUSDTWithdrawn[user],
            totalLevelBGP[user],                // 等级奖励已提现BGP
            // 交互信息
            this.getTodayInteractionCount(user),
            this.getTotalInteractionCount(user),
            totalInteractionBGP[user]
        );
    }
    
    /**
     * @dev 获取全局统计数据
     */
    function getGlobalStats()
        external
        view
        returns (
            uint256 totalInteractionsCount,
            uint256 totalParticipantsCount,
            uint256 bgpTotalSupply,
            uint256 usdtBalance,
            uint256 contractBalance
        )
    {
        return (
            totalInteractions,
            totalParticipants,
            bgpToken.totalSupply(),
            usdtToken.balanceOf(address(this)),
            address(this).balance
        );
    }
    
    /**
     * @dev 设置资金接收地址
     */
    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        address oldTreasury = address(treasury);
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @dev 设置是否自动检查等级
     */
    function setAutoLevelCheck(bool enabled) external onlyOwner {
        autoLevelCheck = enabled;
        emit AutoLevelCheckUpdated(enabled);
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
     * @dev 紧急提取 ETH（仅在紧急情况下使用）
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "ETH withdraw failed");
        }
    }

    /**
     * @dev 紧急提取 ERC20 Token（仅在紧急情况下使用）
     */
    function emergencyWithdrawToken(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            require(token.transfer(owner(), balance), "Token withdraw failed");
        }
    }
    
    /**
     * @dev 接收 ETH
     */
    receive() external payable {}
}
