#!/bin/bash

# 导出合约 ABI 到前端可用的格式
# 使用方法: ./export-abi.sh

echo "Exporting contract ABIs..."

# 创建输出目录
OUTPUT_DIR="../lib/contracts"
mkdir -p $OUTPUT_DIR

# 导出 BGPToken ABI
echo "Exporting BGPToken ABI..."
forge inspect src/BGPToken.sol:BGPToken abi > $OUTPUT_DIR/BGPToken.json

# 导出 BelaChainDApp ABI
echo "Exporting BelaChainDApp ABI..."
forge inspect src/BelaChainDApp.sol:BelaChainDApp abi > $OUTPUT_DIR/BelaChainDApp.json

# 创建地址配置文件
echo "Creating address config..."
cat > $OUTPUT_DIR/addresses.ts << 'EOF'
/**
 * 智能合约地址配置
 * 部署后请更新这些地址
 */

export const CONTRACT_ADDRESSES = {
  // Arbitrum 主网
  mainnet: {
    bgpToken: '0x0000000000000000000000000000000000000000', // TODO: 更新为实际地址
    belaChainDApp: '0x0000000000000000000000000000000000000000', // TODO: 更新为实际地址
  },
  // Arbitrum Sepolia 测试网
  testnet: {
    bgpToken: '0x0000000000000000000000000000000000000000', // TODO: 更新为实际地址
    belaChainDApp: '0x0000000000000000000000000000000000000000', // TODO: 更新为实际地址
  },
} as const;

// 根据链 ID 获取地址
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 42161: // Arbitrum One
      return CONTRACT_ADDRESSES.mainnet;
    case 421614: // Arbitrum Sepolia
      return CONTRACT_ADDRESSES.testnet;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}
EOF

# 创建类型定义文件
echo "Creating TypeScript types..."
cat > $OUTPUT_DIR/types.ts << 'EOF'
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
EOF

echo "✅ ABIs exported successfully to $OUTPUT_DIR"
echo "📝 Don't forget to update contract addresses in addresses.ts after deployment!"
