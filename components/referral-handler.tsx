"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";

/**
 * 推荐人处理组件
 * 检测到 ?ref 参数时跳转到 team 页面处理
 */
export function ReferralHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // 避免重复跳转
    if (hasRedirected.current) return;
    
    // 获取推荐人地址
    const ref = searchParams?.get("ref");
    if (!ref) return;

    console.log("Detected referral link, redirecting to team page with ref:", ref);
    
    // 跳转到 team 页面，保留 ref 参数
    hasRedirected.current = true;
    router.push(`/team?ref=${ref}`);
  }, [searchParams, router]);

  // 这是一个无UI组件
  return null;
}
