import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// 获取 WalletConnect 项目 ID（需要从 https://cloud.walletconnect.com 获取）
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

if (!projectId) throw new Error('需要设置 NEXT_PUBLIC_PROJECT_ID')

// 定义本地网络
const localhost = defineChain({
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
})

// 配置元数据
const metadata = {
  name: 'BelaChain DApp',
  description: 'BelaChain 去中心化应用 - BGP 代币生态系统',
  url: 'https://belachain.io', // 替换为你的域名
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 根据环境变量选择支持的链
const networkMode = process.env.NEXT_PUBLIC_NETWORK || 'arbitrum'
let chains: readonly [typeof localhost] | readonly [typeof arbitrumSepolia] | readonly [typeof arbitrum]

if (networkMode === 'localnet') {
  chains = [localhost] as const
} else if (networkMode === 'arbitrum-sepolia') {
  chains = [arbitrumSepolia] as const
} else {
  chains = [arbitrum] as const
}

// 创建 Wagmi 配置
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,  // 保持 true，与 output: export 兼容
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
  enableWalletConnect: true,  // 支持 WalletConnect (TP钱包等)
  enableInjected: true,       // 支持浏览器注入钱包
  enableEIP6963: true,        // 支持多钱包标准
  enableCoinbase: true,       // 支持 Coinbase 钱包
})
