/**
 * 智能合约地址配置
 * 直接从环境变量读取，由 web3.ts 处理网络切换逻辑
 */

export type NetworkConfig = {
  bgpToken: string;
  usdt: string;
  dapp: string;
};

/**
 * 获取当前合约地址（直接读环境变量）
 */
export function getContractAddresses(): NetworkConfig {
  return {
    bgpToken: process.env.NEXT_PUBLIC_BGP_TOKEN_ADDRESS || '',
    usdt: process.env.NEXT_PUBLIC_USDT_ADDRESS || '',
    dapp: process.env.NEXT_PUBLIC_DAPP_ADDRESS || '',
  };
}
