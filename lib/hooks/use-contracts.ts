'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, type Abi } from 'viem'
import { getContractAddresses } from '../contracts/addresses'
import BelaChainDAppArtifact from '../../artifacts/contracts/BelaChainDApp.sol/BelaChainDApp.json'
import BGPTokenArtifact from '../../artifacts/contracts/BGPToken.sol/BGPToken.json'
import type { UserInfo } from '../contracts/types'

const DAppABI = BelaChainDAppArtifact.abi as Abi
const BGPTokenABI = BGPTokenArtifact.abi as Abi

/**
 * 获取用户信息
 */
export function useUserInfo() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getUserInfo',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  // 映射合约返回的元组到 UserInfo 对象
  const userInfo: UserInfo | undefined = data ? {
    userReferrer: (data as any[])[0],
    directReferralCount: (data as any[])[1],
    userTeamSize: (data as any[])[2],
    userContribution: (data as any[])[3],
    userTotalReferralRewards: (data as any[])[4],
    currentLevel: (data as any[])[5],
    userPendingUSDT: (data as any[])[6],
    userTotalUSDTWithdrawn: (data as any[])[7],
    userTotalLevelBGP: (data as any[])[8],
    todayInteractionCount: (data as any[])[9],
    totalInteractionCount: (data as any[])[10],
    userPendingInteractionBGP: (data as any[])[11],
    userTotalInteractionBGPWithdrawn: (data as any[])[12],
  } : undefined

  return {
    userInfo,
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
  const addresses = chainId ? getContractAddresses() : null

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
 * 注册推荐�?
 */
export function useRegister() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const register = (referrer: string) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
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
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const interact = async (ipHash: string) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'interact',
      args: [ipHash],
      value: parseEther('0.00015'), // 0.6 USDT (ETH @ $4000)
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
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimLevelReward = (level: number) => {
    if (!addresses) return
    
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
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
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdrawUSDT = () => {
    if (!addresses) return
    
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
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
 * 提现交互奖励BGP
 */
export function useWithdrawInteractionBGP() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdrawBGP = () => {
    if (!addresses) return
    
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'withdrawInteractionBGP',
      args: [],
    })
  }

  return {
    withdrawBGP,
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
  const addresses = chainId ? getContractAddresses() : null
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
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
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

/**
 * 获取交互状态
 */
export function useInteractionStatus() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'checkInteractionStatus',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  const result = data as [boolean, bigint, number] | undefined

  return {
    canInteract: result?.[0],
    nextSlotTime: result?.[1] ? Number(result[1]) : undefined,
    todayCount: result?.[2],
    isLoading,
    error,
    refetch,
  }
}

/**
 * 获取全局统计数据
 */
export function useGlobalStats() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getGlobalStats',
    query: {
      enabled: !!addresses,
    },
  })

  const result = data as [bigint, bigint, bigint, bigint, bigint] | undefined

  return {
    totalInteractions: result?.[0] ? Number(result[0]) : 0,
    totalParticipants: result?.[1] ? Number(result[1]) : 0,
    bgpTotalSupply: result?.[2] ? formatEther(result[2]) : '0',
    usdtBalance: result?.[3] ? Number(result[3]) / 1e6 : 0, // USDT 6位精度
    contractBalance: result?.[4] ? formatEther(result[4]) : '0',
    isLoading,
    error,
    refetch,
  }
}

/**
 * 获取等级领取状态
 */
export function useLevelClaimStatus() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getLevelClaimStatus',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  // 返回 bool[12] 数组
  const claimedLevels = data as boolean[] | undefined

  return {
    claimedLevels: claimedLevels || Array(12).fill(false),
    isLoading,
    error,
    refetch,
  }
}

