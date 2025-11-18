/**
 * 智能合约类型定义
 */

export interface UserInfo {
  // 推荐信息
  userReferrer: string;
  directReferralCount: bigint;
  userTeamSize: bigint;
  userContribution: bigint;
  userPendingLevelBGP: bigint; // 待提现的等级奖励BGP
  userTotalReferralBGPWithdrawn: bigint; // 推荐奖励已发放BGP（直接到账）
  // 等级信息
  currentLevel: number;
  userPendingUSDT: bigint;
  userTotalUSDTWithdrawn: bigint;
  userTotalLevelBGP: bigint; // 等级奖励已提现BGP
  // 交互信息
  todayInteractionCount: number;
  totalInteractionCount: bigint;
  userTotalInteractionBGP: bigint; // 总交互BGP（直接发放）
  // 早鸟奖励信息
  hasClaimedEarlyBird: boolean;
}

export interface GlobalStats {
  totalInteractionsCount: bigint;
  totalParticipantsCount: bigint;
  bgpTotalSupply: bigint;
  contractBalance: bigint;
}

export interface InteractionStatus {
  canInteractSlot1: boolean;
  canInteractSlot2: boolean;
  todayCount: number;
  nextSlotStartTime: bigint;
}

export interface Level {
  requiredContribution: bigint;
  usdtReward: bigint;
  bgpReward: bigint;
}

export enum RewardTokenType {
  USDT = 0,
  BGP = 1,
}

export enum RewardCategoryType {
  LevelUnlock = 0,
  LevelUSDTWithdraw = 1,
  LevelBGPWithdraw = 2,
  Interaction = 3,
  Referral = 4,
  EarlyBird = 5,
}

export interface RewardRecord {
  category: RewardCategoryType;
  token: RewardTokenType;
  amount: bigint;
  timestamp: bigint;
}
