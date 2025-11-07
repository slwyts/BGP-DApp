"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useRegister } from "@/lib/hooks/use-contracts";
import { isAddress } from "viem";

/**
 * 推荐人处理组件
 * 自动检测 URL 中的 ?ref=address 参数并注册推荐关系
 */
export function ReferralHandler() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { register, isSuccess, isPending } = useRegister();

  useEffect(() => {
    if (!isConnected || !address) return;

    // 检查是否已经注册过
    const hasRegistered = localStorage.getItem(`registered_${address}`);
    if (hasRegistered) return;

    // 获取推荐人地址
    const ref = searchParams?.get("ref");
    if (!ref) return;

    // 验证推荐人地址格式
    if (!isAddress(ref)) {
      console.error("Invalid referrer address:", ref);
      return;
    }

    // 不能推荐自己
    if (ref.toLowerCase() === address.toLowerCase()) {
      console.error("Cannot refer yourself");
      return;
    }

    // 注册推荐关系
    try {
      console.log("Registering referrer:", ref);
      register(ref);
    } catch (error) {
      console.error("Failed to register referrer:", error);
    }
  }, [isConnected, address, searchParams, register]);

  // 注册成功后记录
  useEffect(() => {
    if (isSuccess && address) {
      localStorage.setItem(`registered_${address}`, "true");
      console.log("Referral registered successfully");
    }
  }, [isSuccess, address]);

  // 这是一个无UI组件
  return null;
}
