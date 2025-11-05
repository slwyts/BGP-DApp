'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, type Abi } from 'viem'
import { getContractAddresses } from '../contracts/addresses'
import BelaChainDAppABIData from '../contracts/BelaChainDApp.json'
import BGPTokenABIData from '../contracts/BGPToken.json'
import type { UserInfo } from '../contracts/types'

const BelaChainDAppABI = BelaChainDAppABIData as unknown as Abi
const BGPTokenABI = BGPTokenABIData as unknown as Abi

/**
 * 获取用户信息
 */
export function useUserInfo() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.belaChainDApp as `0x${string}`,
    abi: BelaChainDAppABI,
    functionName: 'getUserInfo',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  return {
    userInfo: data as UserInfo | undefined,
    isLoading,
    error,
    refetch,
  }
}

/**
 * 获取 BGP 余额
 */
export function useBGPBalance() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null

  const { data, isLoading, refetch } = useReadContract({
    address: addresses?.bgpToken as `0x${string}`,
    abi: BGPTokenABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  return {
    balance: data ? formatEther(data as bigint) : '0',
    balanceRaw: data as bigint | undefined,
    isLoading,
    refetch,
  }
}

/**
 * 注册推荐人
 */
export function useRegister() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const register = (referrer: string) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.belaChainDApp as `0x${string}`,
      abi: BelaChainDAppABI,
      functionName: 'register',
      args: [referrer],
    })
  }

  return {
    register,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 每日交互
 */
export function useInteract() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const interact = async (ipHash: string) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.belaChainDApp as `0x${string}`,
      abi: BelaChainDAppABI,
      functionName: 'interact',
      args: [ipHash],
      value: parseEther('0.00018'), // ~$0.72 (ETH @ $4000)
    })
  }

  return {
    interact,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 领取等级奖励
 */
export function useClaimLevelReward() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimLevelReward = (level: number) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.belaChainDApp as `0x${string}`,
      abi: BelaChainDAppABI,
      functionName: 'claimLevelReward',
      args: [level],
    })
  }

  return {
    claimLevelReward,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 提现 USDT
 */
export function useWithdrawUSDT() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdrawUSDT = () => {
    if (!addresses) return
    
    writeContract({
      address: addresses.belaChainDApp as `0x${string}`,
      abi: BelaChainDAppABI,
      functionName: 'withdrawUSDT',
    })
  }

  return {
    withdrawUSDT,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 转账 BGP
 */
export function useTransferBGP() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const transfer = (to: string, amount: string) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.bgpToken as `0x${string}`,
      abi: BGPTokenABI,
      functionName: 'transfer',
      args: [to, parseEther(amount)],
    })
  }

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 检查是否被封禁
 */
export function useIsBlacklisted() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses(chainId) : null

  const { data, isLoading, refetch } = useReadContract({
    address: addresses?.belaChainDApp as `0x${string}`,
    abi: BelaChainDAppABI,
    functionName: 'isBlacklisted',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  return {
    isBlacklisted: data as boolean | undefined,
    isLoading,
    refetch,
  }
}
