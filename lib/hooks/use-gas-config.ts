'use client'

import { useEffect, useState } from 'react'
import { useEstimateFeesPerGas, useConfig } from 'wagmi'
import { formatGwei } from 'viem'

/**
 * Gas 速度模式
 */
export type GasSpeed = 'slow' | 'standard' | 'fast'

/**
 * Gas 配置
 */
export interface GasConfig {
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

/**
 * 动态获取最优 Gas 配置（低速模式）
 *
 * 策略说明：
 * - slow: 使用最低的 priority fee（base fee + 极小小费），确认时间 30-60秒，成本最低
 * - standard: 使用标准 priority fee，确认时间 15-30秒
 * - fast: 使用较高 priority fee，确认时间 5-15秒
 *
 * Base 链特点：
 * - L2 链，基础 base fee 已经很低（~0.003 Gwei）
 * - priority fee 可以设置得非常低（0.001-0.01 Gwei）仍能确认
 * - 60万 gas * 0.003 Gwei = 0.0018 ETH ≈ $5-7
 */
export function useGasConfig(speed: GasSpeed = 'slow') {
  const config = useConfig()
  const [gasConfig, setGasConfig] = useState<GasConfig>({})

  // 获取链上实时费用估算
  const { data: feesPerGas, isError, isLoading } = useEstimateFeesPerGas({
    chainId: config.chains[0]?.id,
    query: {
      // 每 12 秒刷新一次（Base 的出块时间是 2 秒，所以每 6 个块刷新一次）
      refetchInterval: 12000,
    },
  })

  useEffect(() => {
    if (!feesPerGas) return

    const { maxFeePerGas, maxPriorityFeePerGas } = feesPerGas

    // 根据速度模式调整费用
    let adjustedMaxPriorityFee: bigint
    let adjustedMaxFee: bigint

    switch (speed) {
      case 'slow':
        // 低速模式：priority fee 降低到 10%，节省 ~90% 的 priority fee
        // 例如标准 0.011 Gwei -> 0.0011 Gwei
        adjustedMaxPriorityFee = maxPriorityFeePerGas / BigInt(10)

        // maxFee = baseFee + priorityFee
        // 保守估计：使用当前 baseFee * 1.2 + 低 priorityFee
        adjustedMaxFee = (maxFeePerGas - maxPriorityFeePerGas) * BigInt(12) / BigInt(10) + adjustedMaxPriorityFee
        break

      case 'standard':
        // 标准模式：priority fee 降低到 50%
        adjustedMaxPriorityFee = maxPriorityFeePerGas / BigInt(2)
        adjustedMaxFee = (maxFeePerGas - maxPriorityFeePerGas) * BigInt(13) / BigInt(10) + adjustedMaxPriorityFee
        break

      case 'fast':
        // 快速模式：使用建议的费用
        adjustedMaxPriorityFee = maxPriorityFeePerGas
        adjustedMaxFee = maxFeePerGas
        break

      default:
        adjustedMaxPriorityFee = maxPriorityFeePerGas / BigInt(10)
        adjustedMaxFee = (maxFeePerGas - maxPriorityFeePerGas) * BigInt(12) / BigInt(10) + adjustedMaxPriorityFee
    }

    // 确保最小值（防止过低导致交易失败）
    const minPriorityFee = BigInt(100000) // 0.0001 Gwei 最低小费
    const finalPriorityFee = adjustedMaxPriorityFee < minPriorityFee ? minPriorityFee : adjustedMaxPriorityFee

    setGasConfig({
      maxFeePerGas: adjustedMaxFee,
      maxPriorityFeePerGas: finalPriorityFee,
    })

    // 开发模式下打印日志
    if (process.env.NODE_ENV === 'development') {
      console.log('⛽ Gas 配置 (低速模式):', {
        speed,
        原始MaxFee: formatGwei(maxFeePerGas),
        原始PriorityFee: formatGwei(maxPriorityFeePerGas),
        调整后MaxFee: formatGwei(adjustedMaxFee),
        调整后PriorityFee: formatGwei(finalPriorityFee),
        预计节省: `${((1 - Number(finalPriorityFee) / Number(maxPriorityFeePerGas)) * 100).toFixed(1)}%`,
      })
    }
  }, [feesPerGas, speed])

  return {
    gasConfig,
    isLoading,
    isError,
    // 提供原始数据供参考
    rawFeesPerGas: feesPerGas,
  }
}
