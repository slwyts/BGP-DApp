"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { Timer, Sparkles, Zap, Rocket, PlusCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobeAirdrop } from "@/components/globe-airdrop";
import { WarpBackground } from "@/components/ui/warp-background";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { ClaimAnimationOverlay } from "@/components/claim-animation-overlay";
import { DailyRewardAnimation } from "@/components/daily-reward-animation";
import { StatsGrid } from "@/components/stats-grid";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useInteractionStatus, useInteract, useUserInfo, useEarlyBirdStatus, useGlobalStats } from "@/lib/hooks/use-contracts";
import { getContractAddresses } from "@/lib/contracts/addresses";
import { useWalletClient } from "wagmi";

export default function HomePage() {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [claimOverlay, setClaimOverlay] = useState<{
    open: boolean;
    usdt?: number;
    bgp?: number;
  }>({ open: false });
  const [showDailyRewardAnim, setShowDailyRewardAnim] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [earnedReward, setEarnedReward] = useState(1000); // 保存本次获得的奖励

  // 使用真实合约数据
  const { canInteract, nextSlotTime, todayCount, refetch: refetchStatus } = useInteractionStatus();
  const { interact, isPending, isConfirming, isSuccess } = useInteract();
  const { data: walletClient } = useWalletClient();
  const { userInfo, refetch: refetchUserInfo } = useUserInfo();
  const { isEarlyBirdAvailable, earlyBirdReward } = useEarlyBirdStatus();
  const { refetch: refetchGlobalStats } = useGlobalStats();

  // 计算本次交互将获得的 BGP 奖励
  const calculateReward = useCallback(() => {
    const baseReward = 1000; // 基础交互奖励
    
    // 如果没有用户数据，默认返回基础奖励
    if (!userInfo) return baseReward;
    
    // 判断是否获得早鸟奖励的关键标志：hasClaimedEarlyBird
    // 如果还没领过早鸟奖励，并且是首次交互（或者没有推荐人），就给早鸟奖励
    const isFirstTimeUser = userInfo.totalInteractionCount === BigInt(0) && 
                           userInfo.userReferrer === '0x0000000000000000000000000000000000000000';
    
    if (!userInfo.hasClaimedEarlyBird && isFirstTimeUser && isEarlyBirdAvailable) {
      return baseReward + earlyBirdReward; // 6000 BGP
    }
    
    return baseReward; // 1000 BGP
  }, [userInfo, isEarlyBirdAvailable, earlyBirdReward]);

  useEffect(() => {
    const timer = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    container: hydrated ? containerRef : undefined,
  });
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const headerY = useTransform(scrollYProgress, [0, 0.2], [0, -20]);

  const dailyLimit = 2;

  const formatCooldown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const playSound = () => {
    try {
      const audio = new Audio("/sound.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  const addRecord = (type: "BGP" | "USDT", amount: number) => {
    try {
      const key = "claimRecords";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [...existing, { type, amount, ts: Date.now() }].slice(-100);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // 计算倒计时
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!nextSlotTime || canInteract) {
      setCooldown(0);
      return;
    }
    
    const updateCooldown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, nextSlotTime - now);
      setCooldown(diff);
    };
    
    updateCooldown();
    const id = setInterval(updateCooldown, 1000);
    return () => clearInterval(id);
  }, [nextSlotTime, canInteract]);

  // 交互成功后的处理
  useEffect(() => {
    if (isSuccess) {
      setShowDailyRewardAnim(true);
      
      setTimeout(() => {
        setShowDailyRewardAnim(false);
        onClaim({ bgp: earnedReward }); // 使用保存的奖励金额
        
        // 刷新所有数据
        refetchStatus();      // 刷新交互状态
        refetchUserInfo();    // 刷新用户信息
        refetchGlobalStats(); // 刷新全局统计
        
        console.log('✅ 交互成功，数据已刷新');
      }, 1200);
    }
  }, [isSuccess, earnedReward, refetchStatus, refetchUserInfo, refetchGlobalStats]);

  const nextSlotLabel = useMemo(() => {
    if (!nextSlotTime) return "";
    const date = new Date(nextSlotTime * 1000);
    const h = date.getHours();
    const m = date.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, [nextSlotTime]);

  const onClaim = (payout?: { usdt?: number; bgp?: number }) => {
    playSound();
    setClaimOverlay({ open: true, usdt: payout?.usdt, bgp: payout?.bgp });
    if (payout?.bgp) addRecord("BGP", payout.bgp);
    if (payout?.usdt) addRecord("USDT", payout.usdt);
  };

  const onInteract = async () => {
    if (!canInteract || isPending || isConfirming) {
      console.log('⏸️ 按钮被禁用:', { canInteract, isPending, isConfirming })
      return
    }

    // 在交互前计算奖励并保存
    const reward = calculateReward();
    console.log('🎁 本次交互奖励计算:', {
      reward,
      userInfo: userInfo ? {
        totalInteractionCount: Number(userInfo.totalInteractionCount),
        hasClaimedEarlyBird: userInfo.hasClaimedEarlyBird,
        userReferrer: userInfo.userReferrer,
      } : 'null',
      isEarlyBirdAvailable,
      earlyBirdReward
    });
    setEarnedReward(reward);

    try {
      // 不再需要生成 IP hash
      interact();  // 直接调用，不传 ipHash
    } catch (error) {
      console.error("❌ 交互失败:", error);
    }
  };

  // 添加 BGP 代币到钱包
  const handleAddBGPToWallet = async () => {
    try {
      if (!walletClient) {
        console.error('Wallet not connected');
        return;
      }

      const addresses = getContractAddresses();
      
      // 使用 wagmi 的 walletClient 调用 wallet_watchAsset
      await walletClient.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: addresses.bgpToken,
            symbol: 'BGP',
            decimals: 18,
            image: 'https://raw.githubusercontent.com/slwyts/BGP-DApp/main/public/BelachainLogo.jpg',
          },
        },
      } as any);

      console.log('BGP token add request sent');
    } catch (error: any) {
      // 用户取消不算错误
      if (error?.code === 4001) {
        console.log('User cancelled token addition');
        return;
      }
      console.error('Failed to add BGP token:', error);
    }
  };

  // 确定按钮状态
  const status = isPending || isConfirming ? "pending" : canInteract ? "ready" : "cooldown";

  if (!mounted) {
    return null;
  }

  return (
    <WarpBackground
      perspective={100}
      beamsPerSide={2}
      beamSize={6}
      beamDuration={6}
      gridColor="rgba(255, 140, 50, 0.12)"
      className="min-h-screen"
    >
      <div className="min-h-screen text-foreground overflow-hidden relative">
        <ClaimAnimationOverlay
          open={claimOverlay.open}
          amountUSDT={claimOverlay.usdt}
          amountBGP={claimOverlay.bgp}
          autoCloseMs={null}
          onClose={() => setClaimOverlay({ open: false })}
        />
        <DailyRewardAnimation
          open={showDailyRewardAnim}
          onClose={() => setShowDailyRewardAnim(false)}
          amount={earnedReward}
        />

        <SiteHeader />

        <div
          ref={containerRef}
          className="relative z-0 w-full h-screen overflow-y-auto overflow-x-hidden"
        >
          <div className="pt-6 pb-20 px-4 space-y-8 max-w-2xl mx-auto">
            <motion.div
              style={{ opacity: headerOpacity, y: headerY }}
              className="mb-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative"
              >
                <motion.div
                  className="absolute -inset-4 bg-linear-to-r from-primary/20 via-orange-500/20 to-transparent rounded-3xl blur-3xl"
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.4, 0.3],
                  }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-primary/20 to-orange-500/20 border border-primary/30 mb-4"
                  >
                    <Rocket className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      Belachain Airdrop
                    </span>
                  </motion.div>

                  <h1 className="text-6xl font-extrabold mb-4 leading-tight">
                    <span className="bg-linear-to-r from-foreground via-primary to-orange-500 bg-clip-text text-transparent">
                      {t("belaChainTitle")}
                    </span>
                  </h1>

                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-1.5 bg-linear-to-r from-primary via-orange-500 to-transparent rounded-full mb-5"
                  />

                  {/* Description removed per request */}
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-8 bg-linear-to-b from-primary/10 via-orange-500/5 to-transparent rounded-[3rem] blur-3xl" />
              <div className="relative bg-card/20 backdrop-blur-md rounded-3xl border border-primary/20 p-6 shadow-2xl">
                <div className="w-full max-w-lg mx-auto">
                  <GlobeAirdrop />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-linear-to-r from-primary/30 via-orange-500/30 to-orange-600/30 rounded-3xl blur-2xl animate-pulse pointer-events-none" />
              <Button
                onClick={onInteract}
                disabled={status !== "ready"}
                className="relative w-full h-20 text-xl font-bold rounded-2xl bg-linear-to-r from-primary via-orange-500 to-orange-600 text-white shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 1,
                  }}
                />

                {status === "ready" && (
                  <span className="flex items-center gap-3 relative z-10">
                    <Sparkles className="w-6 h-6" />
                    {t("interactNow")}
                    <Sparkles className="w-6 h-6" />
                  </span>
                )}
                {status === "pending" && (
                  <span className="flex items-center gap-3 relative z-10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <Zap className="w-6 h-6" />
                    </motion.div>
                    {t("pending")}
                  </span>
                )}
                {status === "cooldown" && (
                  <span className="flex items-center gap-3 relative z-10">
                    <Timer className="w-6 h-6" />
                    {cooldown > 0 ? (
                      <>
                        {t("cooldown")} · {formatCooldown(cooldown)}
                      </>
                    ) : (
                      <>{t("nextSlot")} {nextSlotLabel || "00:00"}</>
                    )}
                  </span>
                )}
              </Button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex items-center justify-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("todayProgress")}:
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: dailyLimit }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className={`w-3 h-3 rounded-full ${
                          i < (todayCount || 0)
                            ? "bg-linear-to-r from-primary to-orange-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-primary ml-1">
                    {todayCount || 0}/{dailyLimit}
                  </span>
                </div>
              </motion.div>

              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="w-full max-w-xs bg-transparent"
                  onClick={handleAddBGPToWallet}
                >
                  <PlusCircle className="w-4 h-4 mr-2" /> {t("addBGPToWallet")}
                </Button>
              </div>
            </motion.div>

            <StatsGrid />

            {/* Activity feed moved to Me page */}

            {/* <NavMenu /> */}
          </div>
        </div>
      </div>
    </WarpBackground>
  );
}
