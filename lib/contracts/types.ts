/**
 * 智能合约类型定义
 */

export interface UserInfo {
  // 推荐信息
  userReferrer: string;
  directReferralCount: bigint;
  userTeamSize: bigint;
  userContribution: bigint;
  userTotalReferralRewards: bigint;
  // 等级信息
  currentLevel: number;
  userPendingUSDT: bigint;
  userTotalUSDTWithdrawn: bigint;
  userTotalLevelBGP: bigint;
  // 交互信息
  todayInteractionCount: number;
  totalInteractionCount: bigint;
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
