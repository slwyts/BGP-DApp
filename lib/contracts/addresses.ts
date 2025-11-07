/**
 * 智能合约地址配置
 * 根据环境变量自动选择网络
 */

export type NetworkConfig = {
  bgpToken: string;
  usdt: string;
  dapp: string;
};

export const CONTRACT_ADDRESSES: Record<string, NetworkConfig> = {
  // 本地开发网络
  localnet: {
    bgpToken: process.env.NEXT_PUBLIC_BGP_TOKEN_ADDRESS || '',
    usdt: process.env.NEXT_PUBLIC_USDT_ADDRESS || '',
    dapp: process.env.NEXT_PUBLIC_DAPP_ADDRESS || '',
  },
  // Arbitrum Sepolia 测试网
  development: {
    bgpToken: process.env.NEXT_PUBLIC_BGP_TOKEN_ADDRESS || '',
    usdt: process.env.NEXT_PUBLIC_USDT_ADDRESS || '',
    dapp: process.env.NEXT_PUBLIC_DAPP_ADDRESS || '',
  },
  // Arbitrum One 主网
  production: {
    bgpToken: process.env.NEXT_PUBLIC_BGP_TOKEN_ADDRESS || '',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum USDT 官方地址
    dapp: process.env.NEXT_PUBLIC_DAPP_ADDRESS || '',
  },
} as const;

/**
 * 获取当前网络配置
 * 优先读取 NEXT_PUBLIC_NETWORK 环境变量
 */
export function getContractAddresses(): NetworkConfig {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'production';
  
  const addresses = CONTRACT_ADDRESSES[network];
  
  if (!addresses) {
    throw new Error(`Unknown network: ${network}. Valid options: localnet, development, production`);
  }
  
  return addresses;
}

/**
 * 根据链 ID 验证网络是否匹配
 */
export function validateChainId(chainId: number): boolean {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'production';
  
  const expectedChainIds: Record<string, number[]> = {
    localnet: [1337, 31337], // Hardhat
    development: [421614], // Arbitrum Sepolia
    production: [42161], // Arbitrum One
  };
  
  const expected = expectedChainIds[network];
  if (!expected) {
    return false;
  }
  
  return expected.includes(chainId);
}

/**
 * 获取当前网络的期望 Chain ID
 */
export function getExpectedChainId(): number {
  const network = process.env.NEXT_PUBLIC_NETWORK || 'production';
  
  const chainIds: Record<string, number> = {
    localnet: 1337,
    development: 421614,
    production: 42161,
  };
  
  return chainIds[network] || 42161;
}
