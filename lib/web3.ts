import { http, createConfig } from 'wagmi'
import { arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'

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

// 根据环境变量选择网络
const networkMode = process.env.NEXT_PUBLIC_NETWORK || 'arbitrum'

// 根据网络模式配置链和传输
let chains: readonly [typeof localhost] | readonly [typeof arbitrumSepolia] | readonly [typeof arbitrum]
let transports: Record<number, ReturnType<typeof http>>

if (networkMode === 'localnet') {
  chains = [localhost] as const
  transports = {
    [localhost.id]: http(),
  }
} else if (networkMode === 'arbitrum-sepolia') {
  chains = [arbitrumSepolia] as const
  transports = {
    [arbitrumSepolia.id]: http(),
  }
} else {
  chains = [arbitrum] as const
  transports = {
    [arbitrum.id]: http(),
  }
}

// 创建 Wagmi 配置 (最小化 - 只支持浏览器钱包)
export const config = createConfig({
  chains,
  connectors: [
    injected(), // MetaMask, Rabby, TP钱包浏览器版等
  ],
  transports,
  ssr: true,
})
