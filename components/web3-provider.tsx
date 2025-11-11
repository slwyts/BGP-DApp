'use client'

import { ReactNode, useEffect, useState } from 'react'
import { State, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { config, projectId } from '@/lib/web3'

// 创建 QueryClient - 配置自动刷新策略
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // 窗口获得焦点时刷新
      refetchOnReconnect: true, // 重新连接时刷新
      staleTime: 5000, // 数据5秒后视为过期
    },
  },
})

// Web3Modal 实例
let web3modal: ReturnType<typeof createWeb3Modal> | undefined

export function Web3Provider({
  children,
  initialState
}: {
  children: ReactNode
  initialState?: State
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // 只在客户端创建 Web3Modal
    if (!web3modal && typeof window !== 'undefined') {
      web3modal = createWeb3Modal({
        wagmiConfig: config,
        projectId,
        enableAnalytics: false,
        enableOnramp: false,
        themeMode: 'dark',
        themeVariables: {
          '--w3m-accent': '#f97316', // 橙色主色调（orange-500）
          '--w3m-color-mix': '#f97316',
          '--w3m-color-mix-strength': 20,
          '--w3m-border-radius-master': '8px', // 圆角
          '--w3m-font-family': 'inherit', // 使用网站字体
        }
      })
      console.log('✅ Web3Modal 已创建')
    }

    // 监听自定义事件来打开 Web3Modal
    const handleOpenModal = () => {
      console.log('📢 收到 w3m-open 事件')
      if (web3modal) {
        console.log('🚀 正在打开 Web3Modal...')
        web3modal.open()
      } else {
        console.log('❌ Web3Modal 实例不存在')
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('w3m-open', handleOpenModal)
      console.log('✅ w3m-open 事件监听器已添加')
    }

    setMounted(true)

    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('w3m-open', handleOpenModal)
      }
    }
  }, [])

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
