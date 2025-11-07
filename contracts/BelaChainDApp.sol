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

/**
 * @title BelaChainDApp
 * @dev BelaChain 生态 DApp 主合约
 * 整合了所有功能模块：
 * - 推荐奖励系统
 * - 等级奖励系统
 * - 每日交互系统
 * - AntiSybil 防女巫攻击系统
 * 
 * 单一合约部署，便于管理和维护
 */
contract BelaChainDApp is 
    ReferralModule,
    LevelModule,
    InteractionModule,
    ReentrancyGuard,
    Pausable
{
    // 共享变量（被所有模块使用）
    BGPToken public bgpToken;
    IERC20 public usdtToken;
    IAntiSybil public antiSybilContract;
    address payable public treasury;
    
    // 版本信息
    string public constant VERSION = "2.0.0"; // 升级版本号 - 集成 AntiSybil
    
    // 是否启用自动等级检查（每次交互后检查等级）
    bool public autoLevelCheck = true;
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AutoLevelCheckUpdated(bool enabled);
    event AntiSybilContractUpdated(address indexed newAntiSybil);
    
    /**
     * @dev 构造函数
     * @param _bgpToken BGP 代币合约地址
     * @param _usdtToken USDT 代币合约地址
     * @param _antiSybilContract AntiSybil 合约地址
     */
    constructor(
        address _bgpToken,
        address _usdtToken,
        address _antiSybilContract
    ) Ownable(msg.sender) {
        require(_bgpToken != address(0), "Invalid BGP token address");
        require(_usdtToken != address(0), "Invalid USDT token address");
        require(_antiSybilContract != address(0), "Invalid AntiSybil address");
        
        bgpToken = BGPToken(_bgpToken);
        usdtToken = IERC20(_usdtToken);
        antiSybilContract = IAntiSybil(_antiSybilContract);
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
    function _getTreasury() internal view override(LevelModule, InteractionModule) returns (address payable) {
        return treasury;
    }

    /**
     * @dev 实现虚函数：获取 USDT Token
     */
    function _getUSDT() internal view override(LevelModule) returns (IERC20) {
        return usdtToken;
    }
    
    /**
     * @dev 实现虚函数：获取 AntiSybil 合约
     */
    function _getAntiSybil() internal view override(InteractionModule) returns (IAntiSybil) {
        return antiSybilContract;
    }
    
    /**
     * @dev 用户交互主函数
     * @param ipHash IP 地址的哈希值
     */
    function interact(bytes32 ipHash)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        require(msg.value >= INTERACTION_COST, "Insufficient payment");
        
        // 1. 执行交互（发放 BGP 奖励）
        InteractionModule._interact(msg.sender, ipHash);
        
        // 2. 分发推荐奖励（如果用户有推荐人）
        if (referrer[msg.sender] != address(0)) {
            ReferralModule._distributeReferralRewards(msg.sender);
        }
        
        // 3. 检查并更新等级（如果启用）
        if (autoLevelCheck) {
            LevelModule._updateUserLevel(msg.sender, contribution[msg.sender]);
        }
        
        // 4. 转账 gas 费到 treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Transfer failed");
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
            uint256 userTotalReferralRewards,
            // 等级信息
            uint8 currentLevel,
            uint256 userPendingUSDT,
            uint256 userTotalUSDTWithdrawn,
            uint256 userTotalLevelBGP,
            // 交互信息
            uint8 todayInteractionCount,
            uint256 totalInteractionCount
        )
    {
        return (
            // 推荐信息
            referrer[user],
            directReferrals[user].length,
            teamSize[user],
            contribution[user],
            totalReferralRewards[user],
            // 等级信息
            userLevel[user],
            pendingUSDT[user],
            totalUSDTWithdrawn[user],
            totalLevelBGP[user],
            // 交互信息
            this.getTodayInteractionCount(user),
            this.getTotalInteractionCount(user)
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
     * @dev 设置 AntiSybil 合约地址（紧急情况）
     */
    function setAntiSybilContract(address _newAntiSybil) external onlyOwner {
        require(_newAntiSybil != address(0), "Invalid address");
        antiSybilContract = IAntiSybil(_newAntiSybil);
        emit AntiSybilContractUpdated(_newAntiSybil);
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
