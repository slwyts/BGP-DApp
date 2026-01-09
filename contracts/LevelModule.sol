// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BGPToken} from "./BGPToken.sol";
import {RewardHistoryModule} from "./RewardHistoryModule.sol";

abstract contract LevelModule is RewardHistoryModule {
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    function _getUSDT() internal view virtual returns (IERC20);
    function _getPendingReferralBGP(address user) internal view virtual returns (uint256);
    function _getTotalReferralBGPWithdrawn(address user) internal view virtual returns (uint256);
    function _clearPendingReferralBGP(address user) internal virtual;
    function _getContribution(address user) internal view virtual returns (uint256);

    struct Level {
        uint256 requiredContribution;
        uint256 usdtReward;
        uint256 bgpReward;
    }
    
    Level[12] public levels;
    
    mapping(address => uint8) public userLevel; // 当前等级
    mapping(address => mapping(uint8 => bool)) public levelClaimed;
    mapping(address => uint256) public pendingUSDT;
    mapping(address => uint256) public totalUSDTWithdrawn;
    mapping(address => uint256) public pendingLevelBGP;
    mapping(address => uint256) public totalLevelBGP;
    
    uint256 public constant MIN_WITHDRAW_USDT = 10 * 10**6;
    
    event LevelRewardClaimed(
        address indexed user,
        uint8 level,
        uint256 usdtAmount,
        uint256 bgpAmount
    );
    event USDTWithdrawn(address indexed user, uint256 amount);
    event LevelUpdated(address indexed user, uint8 oldLevel, uint8 newLevel);
    
    constructor() {
        levels[0] = Level(10, 1 * 10**5, 200 * 10**18);                // V1: 10, 0.1 USDT, 200 BGP
        levels[1] = Level(50, 5 * 10**5, 200 * 10**18);                // V2: 50, 0.5 USDT, 200 BGP
        levels[2] = Level(100, 1 * 10**6, 200 * 10**18);               // V3: 100, 1 USDT, 200 BGP
        levels[3] = Level(500, 5 * 10**6, 2000 * 10**18);              // V4: 500, 5 USDT, 2000 BGP
        levels[4] = Level(3000, 20 * 10**6, 8000 * 10**18);            // V5: 3000, 20 USDT, 8000 BGP
        levels[5] = Level(10000, 100 * 10**6, 10000 * 10**18);         // V6: 1W, 100 USDT, 1W BGP
        levels[6] = Level(30000, 200 * 10**6, 30000 * 10**18);         // V7: 3W, 200 USDT, 3W BGP
        levels[7] = Level(50000, 300 * 10**6, 50000 * 10**18);         // V8: 5W, 300 USDT, 5W BGP
        levels[8] = Level(100000, 500 * 10**6, 100000 * 10**18);       // V9: 10W, 500 USDT, 10W BGP
        levels[9] = Level(300000, 1000 * 10**6, 300000 * 10**18);      // V10: 30W, 1000 USDT, 30W BGP
        levels[10] = Level(500000, 2000 * 10**6, 500000 * 10**18);     // V11: 50W, 2000 USDT, 50W BGP
        levels[11] = Level(1000000, 10000 * 10**6, 1000000 * 10**18);  // V12: 100W, 1W USDT, 100W BGP
    }

    function _updateUserLevel(address user, uint256 userContribution) internal {
        uint8 oldLevel = userLevel[user];
        uint8 newLevel = _calculateLevel(userContribution);
        
        if (newLevel > oldLevel) {
            userLevel[user] = newLevel;
            emit LevelUpdated(user, oldLevel, newLevel);
        }
    }

    function _calculateLevel(uint256 userContribution) internal view returns (uint8) {
        for (uint8 i = 11; i >= 0; i--) {
            if (userContribution >= levels[i].requiredContribution) {
                return i + 1;
            }
            if (i == 0) break;
        }
        return 0;
    }

    function claimLevelReward(uint8 level) external {
        require(level >= 1 && level <= 12, "Invalid level");
        _updateUserLevel(msg.sender, _getContribution(msg.sender));
        require(userLevel[msg.sender] >= level, "Level not reached");
        require(!levelClaimed[msg.sender][level], "Already claimed");
        
        Level memory levelData = levels[level - 1];
        levelClaimed[msg.sender][level] = true;
        pendingLevelBGP[msg.sender] += levelData.bgpReward;
        pendingUSDT[msg.sender] += levelData.usdtReward;

        _recordReward(msg.sender, RewardCategory.LevelUnlock, RewardToken.BGP, levelData.bgpReward);
        _recordReward(msg.sender, RewardCategory.LevelUnlock, RewardToken.USDT, levelData.usdtReward);
        
        emit LevelRewardClaimed(
            msg.sender,
            level,
            levelData.usdtReward,
            levelData.bgpReward
        );
    }

    function withdrawUSDT() external {
        uint256 amount = pendingUSDT[msg.sender];
        require(amount >= MIN_WITHDRAW_USDT, "Insufficient USDT balance");
        IERC20 usdt = _getUSDT();
        require(usdt.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        pendingUSDT[msg.sender] = 0;
        totalUSDTWithdrawn[msg.sender] += amount;

        require(usdt.transfer(msg.sender, amount), "USDT transfer failed");

        _recordReward(msg.sender, RewardCategory.LevelUSDTWithdraw, RewardToken.USDT, amount);

        emit USDTWithdrawn(msg.sender, amount);
    }

    function withdrawLevelBGP() external {
        uint256 amount = pendingLevelBGP[msg.sender];
        require(amount > 0, "No pending level BGP");

        pendingLevelBGP[msg.sender] = 0;
        totalLevelBGP[msg.sender] += amount;

        require(
            _getBGPToken().transfer(msg.sender, amount),
            "BGP transfer failed"
        );

        _recordReward(msg.sender, RewardCategory.LevelBGPWithdraw, RewardToken.BGP, amount);
    }

    function getCurrentLevel(address user) external view returns (uint8) {
        return userLevel[user];
    }

    function canClaimLevel(address user, uint8 level) external view returns (bool) {
        if (level < 1 || level > 12) return false;
        if (userLevel[user] < level) return false;
        if (levelClaimed[user][level]) return false;
        return true;
    }

    function getLevelClaimStatus(address user) 
        external 
        view 
        returns (bool[12] memory claimed) 
    {
        for (uint8 i = 1; i <= 12; i++) {
            claimed[i - 1] = levelClaimed[user][i];
        }
    }

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
        
        uint8[] memory result = new uint8[](count);
        for (uint8 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }

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
