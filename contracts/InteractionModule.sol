// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BGPToken} from "./BGPToken.sol";
import {RewardHistoryModule} from "./RewardHistoryModule.sol";

abstract contract InteractionModule is RewardHistoryModule {
    function _getBGPToken() internal view virtual returns (BGPToken);
    function _getTreasury() internal view virtual returns (address payable);
    
    uint256 public constant DAILY_BGP_REWARD = 2000 * 10**18;
    uint256 public constant SLOT_DURATION = 12 hours;
    uint256 public constant TIMEZONE_OFFSET = 8 hours;
    
    struct DailyInteraction {
        uint256 lastInteractionDay;
        uint8 todayCount;
        uint256 slot1Time;
        uint256 slot2Time;
        uint256 totalInteractions;
    }
    
    mapping(address => DailyInteraction) public userInteractions;
    mapping(address => uint256) public totalInteractionBGP;
    
    uint256 public totalInteractions;
    uint256 public totalParticipants;
    mapping(address => bool) public hasInteracted;
    
    event Interacted(
        address indexed user,
        uint256 reward,
        uint8 todayCount,
        uint256 totalCount,
        uint256 timestamp
    );

    function _interact(address user) internal {
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        DailyInteraction storage interaction = userInteractions[user];
        if (interaction.lastInteractionDay < currentDay) {
            interaction.lastInteractionDay = currentDay;
            interaction.todayCount = 0;
            interaction.slot1Time = 0;
            interaction.slot2Time = 0;
        }

        require(interaction.todayCount < 2, "Daily limit reached");

        if (currentSlot == 1) {
            require(interaction.slot1Time == 0, "Slot 1 already claimed");
            interaction.slot1Time = block.timestamp;
        } else {
            require(interaction.slot2Time == 0, "Slot 2 already claimed");
            interaction.slot2Time = block.timestamp;
        }

        interaction.todayCount++;
        interaction.totalInteractions++;

        if (!hasInteracted[user]) {
            hasInteracted[user] = true;
            totalParticipants++;
        }

        totalInteractions++;

        require(
            _getBGPToken().transfer(user, DAILY_BGP_REWARD),
            "BGP transfer failed"
        );
        totalInteractionBGP[user] += DAILY_BGP_REWARD;

        _recordReward(user, RewardCategory.Interaction, RewardToken.BGP, DAILY_BGP_REWARD);

        emit Interacted(
            user,
            DAILY_BGP_REWARD,
            interaction.todayCount,
            interaction.totalInteractions,
            block.timestamp
        );
    }

    function _getCurrentSlot() internal view returns (uint256 currentDay, uint8 currentSlot) {
        uint256 adjustedTimestamp = block.timestamp + TIMEZONE_OFFSET;
        
        currentDay = adjustedTimestamp / 1 days;
        uint256 timeInDay = adjustedTimestamp % 1 days;
        
        if (timeInDay < SLOT_DURATION) {
            currentSlot = 1;
        } else {
            currentSlot = 2;
        }
    }

    function checkInteractionStatus(address user)
        external
        view
        returns (
            bool canInteract,
            uint256 nextSlotTime,
            uint8 todayCount
        )
    {
        (uint256 currentDay, uint8 currentSlot) = _getCurrentSlot();
        DailyInteraction memory interaction = userInteractions[user];

        uint256 adjustedTimestamp = block.timestamp + TIMEZONE_OFFSET;
        uint256 daysSinceEpoch = adjustedTimestamp / 1 days;
        uint256 dayStartTimestamp = (daysSinceEpoch * 1 days) - TIMEZONE_OFFSET;
        
        if (interaction.lastInteractionDay < currentDay) {
            canInteract = true;
            todayCount = 0;
            nextSlotTime = currentSlot == 1 ? dayStartTimestamp : dayStartTimestamp + SLOT_DURATION;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        todayCount = interaction.todayCount;
        
        if (interaction.todayCount >= 2) {
            canInteract = false;
            nextSlotTime = dayStartTimestamp + 1 days;
            return (canInteract, nextSlotTime, todayCount);
        }
        
        if (currentSlot == 1 && interaction.slot1Time == 0) {
            canInteract = true;
            nextSlotTime = dayStartTimestamp;
        } else if (currentSlot == 2 && interaction.slot2Time == 0) {
            canInteract = true;
            nextSlotTime = dayStartTimestamp + SLOT_DURATION;
        } else {
            canInteract = false;
            if (currentSlot == 1 && interaction.slot1Time != 0 && interaction.slot2Time == 0) {
                nextSlotTime = dayStartTimestamp + SLOT_DURATION;
            } else {
                nextSlotTime = dayStartTimestamp + 1 days;
            }
        }
        
        return (canInteract, nextSlotTime, todayCount);
    }

    function getTodayInteractionCount(address user) external view returns (uint8) {
        (uint256 currentDay, ) = _getCurrentSlot();
        DailyInteraction memory interaction = userInteractions[user];
        
        if (interaction.lastInteractionDay < currentDay) {
            return 0;
        }
        
        return interaction.todayCount;
    }

    function getTotalInteractionCount(address user) external view returns (uint256) {
        return userInteractions[user].totalInteractions;
    }
}
