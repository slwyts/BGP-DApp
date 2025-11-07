import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage } from 'wagmi'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// 获取 WalletConnect 项目 ID（需要从 https://cloud.walletconnect.com 获取）
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || ''

if (!projectId) throw new Error('需要设置 NEXT_PUBLIC_PROJECT_ID')

// 定义本地网络
const localhost = defineChain({
  id: 1337,
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
const chains = networkMode === 'localnet' 
  ? [localhost] as const
  : [arbitrum, arbitrumSepolia] as const

// 创建 Wagmi 配置
export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  }),
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true,
})
