// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BGPToken} from "./BGPToken.sol";
import {IAntiSybil} from "./AntiSybil.sol";
import {RewardHistoryModule} from "./RewardHistoryModule.sol";

abstract contract ReferralModule is Ownable, RewardHistoryModule {
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getAntiSybil() internal view virtual returns (IAntiSybil);
    function _getTreasury() internal view virtual returns (address payable);
    
    struct ReferralReward {
        uint256 bgpAmount;
        uint256 contributionValue;
    }
    
    mapping(uint8 => ReferralReward) public levelRewards;
    
    mapping(address => address) public referrer;
    mapping(address => address[]) public directReferrals;
    mapping(address => uint256) public contribution;
    mapping(address => uint256) public registeredAt;
    
    mapping(address => uint256) public pendingReferralBGP;
    mapping(address => uint256) public totalReferralBGPWithdrawn;
    mapping(address => uint256) public teamSize;
    
    uint256 public totalRegistered;
    uint256 public constant EARLY_BIRD_LIMIT = 10000;
    uint256 public constant EARLY_BIRD_REWARD = 5000 * 10**18;

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
        levelRewards[1] = ReferralReward(800 * 10**18, 8);
        levelRewards[2] = ReferralReward(400 * 10**18, 4);
        levelRewards[3] = ReferralReward(200 * 10**18, 2);
        for (uint8 i = 4; i <= 15; i++) {
            levelRewards[i] = ReferralReward(100 * 10**18, 1);
        }
    }

    function _register(
        address user,
        address _referrer,
        bytes16 ipAddr,
        uint256 timestamp,
        bytes calldata signature
    ) internal {
        require(referrer[user] == address(0), "Already registered");
        address actualReferrer;
        if (user == owner()) {
            actualReferrer = address(1);
        } else {
            require(_referrer != user, "Cannot refer yourself");
            require(_referrer != address(0), "Invalid referrer");
            if (_referrer != owner()) {
                require(referrer[_referrer] != address(0), "Referrer must be registered first");
            }
            
            actualReferrer = _referrer;
        }

        IAntiSybil antiSybil = _getAntiSybil();
        require(!antiSybil.isBlacklisted(user), "Address is blacklisted");
        antiSybil.registerAddress(user, ipAddr, timestamp, signature);
        referrer[user] = actualReferrer;
        
        if (user != owner()) {
            directReferrals[actualReferrer].push(user);
            address current = actualReferrer;
            for (uint8 i = 0; i < 15 && current != address(0) && current != address(1); i++) {
                teamSize[current]++;
                current = referrer[current];
            }
        }

        registeredAt[user] = block.timestamp;
        totalRegistered++;

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

    function _distributeReferralRewards(address user) internal {
        address current = referrer[user];

        for (uint8 level = 1; level <= 15 && current != address(0); level++) {
            uint256 directCount = directReferrals[current].length;
            if (directCount >= level) {
                ReferralReward memory reward = levelRewards[level];

                require(
                    _getBGPToken().transfer(current, reward.bgpAmount),
                    "BGP transfer failed"
                );

                _recordReward(current, RewardCategory.Referral, RewardToken.BGP, reward.bgpAmount);

                totalReferralBGPWithdrawn[current] += reward.bgpAmount;

                contribution[current] += reward.contributionValue;

                emit ReferralRewardDistributed(
                    current,
                    user,
                    level,
                    reward.bgpAmount,
                    reward.contributionValue
                );
            }

            current = referrer[current];
        }
    }

    function _getPendingReferralBGP(address user) internal view virtual returns (uint256) {
        return pendingReferralBGP[user];
    }

    function _getTotalReferralBGPWithdrawn(address user) internal view virtual returns (uint256) {
        return totalReferralBGPWithdrawn[user];
    }

    function _clearPendingReferralBGP(address user) internal virtual {
        uint256 amount = pendingReferralBGP[user];
        pendingReferralBGP[user] = 0;
        totalReferralBGPWithdrawn[user] += amount;
    }

    function setContribution(address user, uint256 value) external onlyOwner {
        contribution[user] = value;
    }

    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }

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

    function getDirectReferralCount(address user) external view returns (uint256) {
        return directReferrals[user].length;
    }

    function getTeamSize(address user) external view returns (uint256) {
        return teamSize[user];
    }

    function getReferralPath(address user) external view returns (address[] memory) {
        address[] memory path = new address[](15);
        address current = referrer[user];
        uint256 count = 0;
        
        for (uint8 i = 0; i < 15 && current != address(0); i++) {
            path[count] = current;
            count++;
            current = referrer[current];
        }

        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = path[i];
        }
        
        return result;
    }
}
