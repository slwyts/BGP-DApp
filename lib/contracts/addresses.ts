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
