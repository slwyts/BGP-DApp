/**
 * 智能合约类型定义
 */

export interface UserInfo {
  // 推荐信息
  userReferrer: string;
  directReferralCount: bigint;
  userTeamSize: bigint;
  userContribution: bigint;
  userPendingReferralBGP: bigint; // 待提现的推荐奖励BGP
  userTotalReferralBGPWithdrawn: bigint; // 已提现的推荐奖励BGP
  // 等级信息
  currentLevel: number;
  userPendingUSDT: bigint;
  userTotalUSDTWithdrawn: bigint;
  userTotalLevelBGP: bigint;
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
