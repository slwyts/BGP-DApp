'use client'

import { ReactNode } from 'react'
import { State, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config, projectId } from '@/lib/web3'

// 创建 QueryClient
const queryClient = new QueryClient()

// 创建 Web3Modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: true,
  enableOnramp: false,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6', // 主题色
  }
})

export function Web3Provider({
  children,
  initialState
}: {
  children: ReactNode
  initialState?: State
}) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
