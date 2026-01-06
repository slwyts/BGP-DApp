'use client'

import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt, useBlockNumber, useBlock } from 'wagmi'
import { parseEther, formatEther, type Abi } from 'viem'
import { getContractAddresses } from '../contracts/addresses'
import BelaChainDAppArtifact from '../../artifacts/contracts/BelaChainDApp.sol/BelaChainDApp.json'
import BGPTokenArtifact from '../../artifacts/contracts/BGPToken.sol/BGPToken.json'
import AntiSybilArtifact from '../../artifacts/contracts/AntiSybil.sol/AntiSybil.json'
import type { UserInfo, RewardRecord, RewardCategoryType, RewardTokenType } from '../contracts/types'

const DAppABI = BelaChainDAppArtifact.abi as Abi
const BGPTokenABI = BGPTokenArtifact.abi as Abi
const AntiSybilABI = AntiSybilArtifact.abi as Abi

/**
 * 获取区块链当前时间戳
 */
export function useBlockTimestamp() {
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { data: block } = useBlock({ 
    blockNumber,
    query: {
      enabled: !!blockNumber,
    }
  })
  
  return {
    timestamp: block?.timestamp ? Number(block.timestamp) : undefined,
    isLoading: !block,
  }
}

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
    userPendingLevelBGP: (data as any[])[4], // 待提现的等级奖励BGP
    userTotalReferralBGPWithdrawn: (data as any[])[5], // 推荐奖励已发放BGP（直接到账）
    currentLevel: (data as any[])[6],
    userPendingUSDT: (data as any[])[7],
    userTotalUSDTWithdrawn: (data as any[])[8],
    userTotalLevelBGP: (data as any[])[9], // 等级奖励已提现BGP
    todayInteractionCount: (data as any[])[10],
    totalInteractionCount: (data as any[])[11],
    userTotalInteractionBGP: (data as any[])[12], // 总交互BGP（直接发放）
    hasClaimedEarlyBird: false, // 早鸟奖励包含在交互BGP中
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
 * 获取早鸟奖励状态
 */
export function useEarlyBirdStatus() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data: totalRegistered } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'totalRegistered',
    query: {
      enabled: !!addresses,
    },
  })

  const { data: earlyBirdLimit } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'EARLY_BIRD_LIMIT',
    query: {
      enabled: !!addresses,
    },
  })

  const { data: earlyBirdReward } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'EARLY_BIRD_REWARD',
    query: {
      enabled: !!addresses,
    },
  })

  const totalRegisteredNum = totalRegistered !== undefined ? Number(totalRegistered) : null;
  const earlyBirdLimitNum = earlyBirdLimit !== undefined ? Number(earlyBirdLimit) : 10000;
  const earlyBirdRewardNum = earlyBirdReward !== undefined ? Number(formatEther(earlyBirdReward as bigint)) : 5000;

  return {
    totalRegistered: totalRegisteredNum ?? 0,
    earlyBirdLimit: earlyBirdLimitNum,
    earlyBirdReward: earlyBirdRewardNum,
    isEarlyBirdAvailable: totalRegisteredNum !== null && totalRegisteredNum < earlyBirdLimitNum,
  }
}

/**
 * 注册推荐�?
 */
export function useRegister() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { minFee } = useContractConstants()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const register = (referrer: string, ipAddr: string) => {
    if (!addresses || !minFee) return

    // 生成随机费用：0.6-0.8 USD (minFee * 1 到 minFee * 1.333)
    // minFee 是 0.6 USD，随机乘以 1 到 1.333 倍得到 0.6-0.8 USD
    const randomMultiplier = 1 + Math.random() * 0.333 // 1.0 to 1.333
    const randomFee = BigInt(Math.floor(Number(minFee) * randomMultiplier))

    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'register',
      args: [referrer, ipAddr],
      value: randomFee, // 随机费用 0.6-0.8 USD
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
  const { chainId, isConnected } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { minFee } = useContractConstants()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const interact = () => {  // 移除 ipHash 参数
    if (!isConnected) {
      console.error('❌ 钱包未连接')
      return
    }

    if (!addresses || !minFee) {
      console.error('❌ 无法获取合约地址或最小费用')
      return
    }

    // 生成随机费用：0.6-0.8 USD (minFee * 1 到 minFee * 1.333)
    const randomMultiplier = 1 + Math.random() * 0.333 // 1.0 to 1.333
    const randomFee = BigInt(Math.floor(Number(minFee) * randomMultiplier))

    console.log('✅ 发起交互:', { addresses, minFee, randomFee })
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'interact',
      args: [],  // 不再传递 ipHash
      value: randomFee, // 随机费用 0.6-0.8 USD
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
 * 提现等级奖励BGP
 */
export function useWithdrawLevelBGP() {
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
      functionName: 'withdrawLevelBGP',
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

// 向后兼容的别名
export const useWithdrawInteractionBGP = useWithdrawLevelBGP

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
      refetchInterval: 2000, // 每2秒自动刷新一次，确保实时更新
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
 * 获取奖励记录
 */
export function useRewardHistory(limit = 50) {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const args = address ? [address, BigInt(limit)] : undefined

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getLatestRewardHistory',
    args: args as [`0x${string}`, bigint] | undefined,
    query: {
      enabled: !!address && !!addresses,
      refetchInterval: 15000,
    },
  })

  const raw = data as Array<{
    category: RewardCategoryType
    token: RewardTokenType
    amount: bigint
    timestamp: bigint
  }> | undefined

  const records: RewardRecord[] = raw
    ? raw.map((item) => ({
        category: item.category,
        token: item.token,
        amount: BigInt(item.amount),
        timestamp: BigInt(item.timestamp),
      }))
    : []

  return {
    records,
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

/**
 * 获取直推列表及注册时间
 */
export function useDirectReferralsWithTime() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getDirectReferralsWithTime',
    args: [address],
    query: {
      enabled: !!address && !!addresses,
    },
  })

  const result = data as [readonly `0x${string}`[], readonly bigint[]] | undefined

  return {
    addresses: result?.[0] || [],
    timestamps: result?.[1] || [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * 检查当前钱包是否是合约 Owner
 */
export function useIsOwner() {
  const { address, chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data: dappOwner, isLoading: isDappOwnerLoading } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'owner',
    query: {
      enabled: !!addresses,
    },
  })

  const isOwner = address && dappOwner
    ? address.toLowerCase() === (dappOwner as string).toLowerCase()
    : false

  return {
    isOwner,
    ownerAddress: dappOwner as string | undefined,
    isLoading: isDappOwnerLoading,
  }
}

/**
 * 获取合约暂停状态
 */
export function useContractPaused() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data, isLoading, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'paused',
    query: {
      enabled: !!addresses,
    },
  })

  return {
    isPaused: data as boolean | undefined,
    isLoading,
    refetch,
  }
}

/**
 * 暂停/恢复合约 (仅Owner)
 */
export function usePauseContract() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const pause = () => {
    if (!addresses) return
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'pause',
    })
  }

  const unpause = () => {
    if (!addresses) return
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'unpause',
    })
  }

  return {
    pause,
    unpause,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 设置自动等级检查 (仅Owner)
 */
export function useSetAutoLevelCheck() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const { data: autoLevelCheck, refetch } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'autoLevelCheck',
    query: {
      enabled: !!addresses,
    },
  })

  const setAutoLevelCheck = (enabled: boolean) => {
    if (!addresses) return
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'setAutoLevelCheck',
      args: [enabled],
    })
  }

  return {
    autoLevelCheck: autoLevelCheck as boolean | undefined,
    setAutoLevelCheck,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    refetch,
  }
}

/**
 * 紧急提取 (仅Owner)
 */
export function useEmergencyWithdraw() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const emergencyWithdrawETH = () => {
    if (!addresses) return
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'emergencyWithdraw',
    })
  }

  const emergencyWithdrawToken = (tokenAddress: string) => {
    if (!addresses) return
    writeContract({
      address: addresses.dapp as `0x${string}`,
      abi: DAppABI,
      functionName: 'emergencyWithdrawToken',
      args: [tokenAddress],
    })
  }

  return {
    emergencyWithdrawETH,
    emergencyWithdrawToken,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 获取 AntiSybil 合约地址
 */
export function useAntiSybilAddress() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  const { data: bgpTokenAntiSybil } = useReadContract({
    address: addresses?.bgpToken as `0x${string}`,
    abi: BGPTokenABI,
    functionName: 'antiSybilContract',
    query: {
      enabled: !!addresses,
    },
  })

  return {
    antiSybilAddress: bgpTokenAntiSybil as string | undefined,
  }
}

/**
 * AntiSybil 统计数据
 */
export function useAntiSybilStats() {
  const { antiSybilAddress } = useAntiSybilAddress()

  const { data: totalRegistered, refetch: refetchTotal } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'totalRegisteredAddresses',
    query: {
      enabled: !!antiSybilAddress,
    },
  })

  const { data: totalUniqueIPs, refetch: refetchIPs } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'totalUniqueIPs',
    query: {
      enabled: !!antiSybilAddress,
    },
  })

  const { data: maxPerIP } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'MAX_ADDRESSES_PER_IP',
    query: {
      enabled: !!antiSybilAddress,
    },
  })

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'paused',
    query: {
      enabled: !!antiSybilAddress,
    },
  })

  const refetch = () => {
    refetchTotal()
    refetchIPs()
    refetchPaused()
  }

  return {
    totalRegistered: totalRegistered ? Number(totalRegistered) : 0,
    totalUniqueIPs: totalUniqueIPs ? Number(totalUniqueIPs) : 0,
    maxPerIP: maxPerIP ? Number(maxPerIP) : 15,
    isPaused: isPaused as boolean | undefined,
    antiSybilAddress,
    refetch,
  }
}

/**
 * AntiSybil 暂停/恢复 (仅Owner)
 */
export function useAntiSybilPause() {
  const { antiSybilAddress } = useAntiSybilAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const pause = () => {
    if (!antiSybilAddress) return
    writeContract({
      address: antiSybilAddress as `0x${string}`,
      abi: AntiSybilABI,
      functionName: 'pause',
    })
  }

  const unpause = () => {
    if (!antiSybilAddress) return
    writeContract({
      address: antiSybilAddress as `0x${string}`,
      abi: AntiSybilABI,
      functionName: 'unpause',
    })
  }

  return {
    pause,
    unpause,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 地址黑名单管理 (仅Owner)
 */
export function useAddressBlacklist() {
  const { antiSybilAddress } = useAntiSybilAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const blacklistAddress = (address: string, reason: string) => {
    if (!antiSybilAddress) return
    writeContract({
      address: antiSybilAddress as `0x${string}`,
      abi: AntiSybilABI,
      functionName: 'blacklistAddress',
      args: [address, reason],
    })
  }

  const removeFromBlacklist = (address: string) => {
    if (!antiSybilAddress) return
    writeContract({
      address: antiSybilAddress as `0x${string}`,
      abi: AntiSybilABI,
      functionName: 'removeFromBlacklist',
      args: [address],
    })
  }

  return {
    blacklistAddress,
    removeFromBlacklist,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * IP黑名单管理 (仅Owner)
 */
export function useIPBlacklist() {
  const { antiSybilAddress } = useAntiSybilAddress()
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const blacklistIP = (ipAddr: string, reason: string) => {
    if (!antiSybilAddress) return
    writeContract({
      address: antiSybilAddress as `0x${string}`,
      abi: AntiSybilABI,
      functionName: 'blacklistIP',
      args: [ipAddr, reason],
    })
  }

  return {
    blacklistIP,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * 查询地址是否被黑名单
 */
export function useCheckBlacklisted(addressToCheck?: string) {
  const { antiSybilAddress } = useAntiSybilAddress()

  const { data, isLoading, refetch } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'isBlacklisted',
    args: [addressToCheck],
    query: {
      enabled: !!antiSybilAddress && !!addressToCheck,
    },
  })

  return {
    isBlacklisted: data as boolean | undefined,
    isLoading,
    refetch,
  }
}

/**
 * 查询地址关联的IP
 */
export function useAddressToIP(addressToCheck?: string) {
  const { antiSybilAddress } = useAntiSybilAddress()

  const { data, isLoading, refetch } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'addressToIP',
    args: [addressToCheck],
    query: {
      enabled: !!antiSybilAddress && !!addressToCheck,
    },
  })

  return {
    ipAddr: data as string | undefined,
    isLoading,
    refetch,
  }
}

/**
 * 查询IP关联的地址列表
 */
export function useIPToAddresses(ipAddr?: string) {
  const { antiSybilAddress } = useAntiSybilAddress()

  const { data, isLoading, refetch } = useReadContract({
    address: antiSybilAddress as `0x${string}`,
    abi: AntiSybilABI,
    functionName: 'getAddressesForIP',
    args: [ipAddr],
    query: {
      enabled: !!antiSybilAddress && !!ipAddr,
    },
  })

  return {
    addresses: data as string[] | undefined,
    isLoading,
    refetch,
  }
}

/**
 * 获取合约常量
 */
export function useContractConstants() {
  const { chainId } = useAccount()
  const addresses = chainId ? getContractAddresses() : null

  // 动态最小费用（从 FeeModule 读取）
  const { data: minFee } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getMinFee',
    query: {
      enabled: !!addresses,
    },
  })

  // ETH 价格（从预言机读取）
  const { data: ethPrice } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'getEthPrice',
    query: {
      enabled: !!addresses,
    },
  })

  // 最低提现 USDT
  const { data: minWithdrawUSDT } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'MIN_WITHDRAW_USDT',
    query: {
      enabled: !!addresses,
    },
  })

  // 早鸟奖励限制
  const { data: earlyBirdLimit } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'EARLY_BIRD_LIMIT',
    query: {
      enabled: !!addresses,
    },
  })

  // 早鸟奖励金额
  const { data: earlyBirdReward } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'EARLY_BIRD_REWARD',
    query: {
      enabled: !!addresses,
    },
  })

  // 每日 BGP 奖励
  const { data: dailyBGPReward } = useReadContract({
    address: addresses?.dapp as `0x${string}`,
    abi: DAppABI,
    functionName: 'DAILY_BGP_REWARD',
    query: {
      enabled: !!addresses,
    },
  })

  return {
    minFee: minFee as bigint | undefined,
    ethPrice: ethPrice as bigint | undefined,
    minWithdrawUSDT: minWithdrawUSDT as bigint | undefined,
    earlyBirdLimit: earlyBirdLimit ? Number(earlyBirdLimit) : undefined,
    earlyBirdReward: earlyBirdReward as bigint | undefined,
    dailyBGPReward: dailyBGPReward as bigint | undefined,
  }
}

