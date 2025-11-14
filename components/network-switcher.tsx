'use client'

import { useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { config } from '@/lib/web3'

export function NetworkSwitcher() {
  const { isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  useEffect(() => {
    if (!isConnected) return

    const targetChain = config.chains[0]
    
    if (chainId && chainId !== targetChain.id) {
      console.log(`🔄 检测到错误的网络 (Chain ID: ${chainId}), 正在切换到 ${targetChain.name} (Chain ID: ${targetChain.id})`)
      
      const timer = setTimeout(() => {
        switchChain(
          { chainId: targetChain.id },
          {
            onError: async (error) => {
              console.error('切换网络失败:', error)
              
              const errorMessage = error.message.toLowerCase()
              if (errorMessage.includes('unrecognized chain') || 
                  errorMessage.includes('chain') ||
                  errorMessage.includes('network') ||
                  error.name === 'ChainNotConfiguredError') {
                await addNetwork(targetChain)
              }
            },
            onSuccess: () => {
              console.log(`✅ 已成功切换到 ${targetChain.name}`)
            }
          }
        )
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isConnected, chainId, switchChain])

  return null
}

async function addNetwork(chain: typeof config.chains[0]) {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('未检测到以太坊钱包')
    return
  }

  try {
    console.log(`🔧 尝试添加网络: ${chain.name} (Chain ID: ${chain.id})`)
    
    const params: any = {
      chainId: `0x${chain.id.toString(16)}`,
      chainName: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: [chain.rpcUrls.default.http[0]],
    }

    if (chain.blockExplorers?.default?.url) {
      params.blockExplorerUrls = [chain.blockExplorers.default.url]
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [params],
    })
    
    console.log(`✅ 成功添加网络: ${chain.name}`)
  } catch (error: any) {
    console.error('添加网络失败:', error)
    
    if (error.code === 4001) {
      console.log('⚠️ 用户拒绝添加网络')
    } else if (error.code === -32602) {
      console.log('⚠️ 网络参数无效')
    }
  }
}
