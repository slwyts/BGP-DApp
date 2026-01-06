// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

/**
 * @title RewardHistoryModule
 * @dev 通用奖励记录模块，在链上记录所有奖励发放信息（类型、币种、数额、时间）。
 */
abstract contract RewardHistoryModule {
    enum RewardToken {
        USDT,
        BGP
    }

    enum RewardCategory {
        LevelUnlock,
        LevelUSDTWithdraw,
        LevelBGPWithdraw,
        Interaction,
        Referral,
        EarlyBird
    }

    struct RewardRecord {
        RewardCategory category;
        RewardToken token;
        uint128 amount;
        uint64 timestamp;
    }

    mapping(address => RewardRecord[]) internal _rewardHistory;

    event RewardRecorded(
        address indexed user,
        RewardCategory indexed category,
        RewardToken token,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev 记录奖励信息
     */
    function _recordReward(
        address user,
        RewardCategory category,
        RewardToken token,
        uint256 amount
    ) internal {
        RewardRecord memory record = RewardRecord({
            category: category,
            token: token,
            amount: uint128(amount),
            timestamp: uint64(block.timestamp)
        });

        _rewardHistory[user].push(record);
        emit RewardRecorded(user, category, token, amount, block.timestamp);
    }

    /**
     * @dev 获取指定用户的奖励记录（按时间正序）
     */
    function getRewardHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) public view returns (RewardRecord[] memory records) {
        RewardRecord[] storage history = _rewardHistory[user];
        uint256 length = history.length;

        if (offset >= length) {
            return records;
        }

        uint256 end = offset + limit;
        if (end > length) {
            end = length;
        }

        uint256 size = end - offset;
        records = new RewardRecord[](size);

        for (uint256 i = 0; i < size; i++) {
            records[i] = history[offset + i];
        }
    }

    /**
     * @dev 获取指定用户最新的奖励记录（按时间倒序返回）
     */
    function getLatestRewardHistory(
        address user,
        uint256 count
    ) public view returns (RewardRecord[] memory records) {
        RewardRecord[] storage history = _rewardHistory[user];
        uint256 length = history.length;

        if (length == 0) {
            return records;
        }

        uint256 actualCount = count > length ? length : count;
        records = new RewardRecord[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            records[i] = history[length - 1 - i];
        }
    }

    /**
     * @dev 获取奖励记录长度
     */
    function rewardHistoryLength(address user) external view returns (uint256) {
        return _rewardHistory[user].length;
    }
}
