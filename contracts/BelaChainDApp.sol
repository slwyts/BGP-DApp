// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BGPToken} from "./BGPToken.sol";
import {IAntiSybil} from "./AntiSybil.sol";
import {ReferralModule} from "./ReferralModule.sol";
import {LevelModule} from "./LevelModule.sol";
import {InteractionModule} from "./InteractionModule.sol";
import {FeeModule} from "./FeeModule.sol";

/**
 * @title BelaChainDApp
 * @dev BelaChain 生态 DApp 主合约
 * 整合了所有功能模块：
 * - 推荐奖励系统
 * - 等级奖励系统
 * - 每日交互系统
 * - AntiSybil 反日蚀攻击系统
 * - 动态手续费系统（Chainlink 预言机）
 */
contract BelaChainDApp is 
    ReferralModule,
    LevelModule,
    InteractionModule,
    FeeModule,
    ReentrancyGuard,
    Pausable
{
    BGPToken public bgpToken;
    IERC20 public usdtToken;
    string public constant VERSION = "2.0.0";
    bool public autoLevelCheck = true;

    event AutoLevelCheckUpdated(bool enabled);

    constructor(
        address _bgpToken,
        address _usdtToken
    ) Ownable(msg.sender) {
        require(_bgpToken != address(0), "Invalid BGP token address");
        require(_usdtToken != address(0), "Invalid USDT token address");

        bgpToken = BGPToken(_bgpToken);
        usdtToken = IERC20(_usdtToken);
    }

    function _getBGPToken() internal view override(ReferralModule, LevelModule, InteractionModule) returns (BGPToken) {
        return bgpToken;
    }

    function _getTreasury() internal view override(ReferralModule, LevelModule, InteractionModule, FeeModule) returns (address payable) {
        return payable(owner());
    }

    function _getUSDT() internal view override(LevelModule) returns (IERC20) {
        return usdtToken;
    }

    function _getAntiSybil() internal view override(ReferralModule) returns (IAntiSybil) {
        return bgpToken.antiSybilContract();
    }

    function _getPendingReferralBGP(address user) internal view override(LevelModule, ReferralModule) returns (uint256) {
        return pendingReferralBGP[user];
    }

    function _getTotalReferralBGPWithdrawn(address user) internal view override(LevelModule, ReferralModule) returns (uint256) {
        return totalReferralBGPWithdrawn[user];
    }

    function _clearPendingReferralBGP(address user) internal override(LevelModule, ReferralModule) {
        uint256 amount = pendingReferralBGP[user];
        pendingReferralBGP[user] = 0;
        totalReferralBGPWithdrawn[user] += amount;
    }

    function _getContribution(address user) internal view override returns (uint256) {
        return contribution[user];
    }

    function interact()
        external
        payable
        nonReentrant
        whenNotPaused
    {
        uint256 minFee = getMinFee();
        require(msg.value >= minFee, "Insufficient payment");
        require(referrer[msg.sender] != address(0), "Must register with a referrer first");
        _collectFee(msg.value);
        InteractionModule._interact(msg.sender);
        if (referrer[msg.sender] != address(0)) {
            ReferralModule._distributeReferralRewards(msg.sender);
        }
        if (autoLevelCheck) {
            LevelModule._updateUserLevel(msg.sender, contribution[msg.sender]);
        }
    }

    function register(
        address _referrer,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    ) external payable {
        uint256 minFee = getMinFee();
        require(msg.value >= minFee, "Insufficient payment");
        _collectFee(msg.value);
        uint256 registrationNumber = totalRegistered + 1;
        bool willGetEarlyBird = registrationNumber <= EARLY_BIRD_LIMIT;
        ReferralModule._register(msg.sender, _referrer, ipAddr, timestamp, signature);
        if (willGetEarlyBird) {
            totalInteractionBGP[msg.sender] += EARLY_BIRD_REWARD;
        }
        if (referrer[msg.sender] != address(0) && referrer[msg.sender] != address(1)) {
            ReferralModule._distributeReferralRewards(msg.sender);
        }
    }

    function updateLevel() external {
        LevelModule._updateUserLevel(msg.sender, contribution[msg.sender]);
    }

    function batchUpdateLevels(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            LevelModule._updateUserLevel(users[i], contribution[users[i]]);
        }
    }

    function getUserInfo(address user)
        external
        view
        returns (
            address userReferrer,
            uint256 directReferralCount,
            uint256 userTeamSize,
            uint256 userContribution,
            uint256 userPendingLevelBGP,
            uint256 userTotalReferralBGPWithdrawn,
            uint8 currentLevel,
            uint256 userPendingUSDT,
            uint256 userTotalUSDTWithdrawn,
            uint256 userTotalLevelBGP,
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
            pendingLevelBGP[user],
            totalReferralBGPWithdrawn[user],
            userLevel[user],
            pendingUSDT[user],
            totalUSDTWithdrawn[user],
            totalLevelBGP[user],
            this.getTodayInteractionCount(user),
            this.getTotalInteractionCount(user),
            totalInteractionBGP[user]
        );
    }

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

    function setAutoLevelCheck(bool enabled) external onlyOwner {
        autoLevelCheck = enabled;
        emit AutoLevelCheckUpdated(enabled);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            require(success, "ETH withdraw failed");
        }
    }

    function emergencyWithdrawToken(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            require(token.transfer(owner(), balance), "Token withdraw failed");
        }
    }

    receive() external payable {}
}
