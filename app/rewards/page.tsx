"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Crown, TrendingUp, ArrowDownToLine } from "lucide-react";
import { ClaimAnimationOverlay } from "@/components/claim-animation-overlay";
import { LEVELS, getLevelByContribution, getNextLevelRequirement } from "@/lib/constants/levels";
import {
  useUserInfo,
  useClaimLevelReward,
  useWithdrawUSDT,
  useLevelClaimStatus,
  useWithdrawInteractionBGP,
} from "@/lib/hooks/use-contracts";
import { useAccount } from "wagmi";

export default function RewardsPage() {
  const { t } = useLocale();
  const { address } = useAccount();
  
  // 使用真实合约数据
  const { userInfo, refetch: refetchUserInfo } = useUserInfo();
  const { claimedLevels, refetch: refetchClaimStatus } = useLevelClaimStatus();
  const { claimLevelReward, isPending: isClaimPending, isSuccess: isClaimSuccess } = useClaimLevelReward();
  const { withdrawUSDT, isPending: isWithdrawPending, isSuccess: isWithdrawSuccess } = useWithdrawUSDT();
  const { withdrawBGP, isPending: isWithdrawBGPPending, isSuccess: isWithdrawBGPSuccess } = useWithdrawInteractionBGP();

  const [overlay, setOverlay] = useState<{
    open: boolean;
    usdt?: number;
    bgp?: number;
  }>({ open: false });
  
  // 保存本次领取的奖励信息，用于成功后显示
  const [pendingClaim, setPendingClaim] = useState<{ usdt: number; bgp: number } | null>(null);

  // 从合约数据中提取
  const totalContribution = userInfo ? Number(userInfo.userContribution) : 0;
  const userCurrentLevel = userInfo ? Number(userInfo.currentLevel) : 0;
  const theoreticalLevel = useMemo(
    () => getLevelByContribution(totalContribution),
    [totalContribution]
  );
  const displayLevel = Math.max(userCurrentLevel, theoreticalLevel);
  const withdrawableUSDT = userInfo ? Number(userInfo.userPendingUSDT) / 1e6 : 0; // USDT 6位精度
  const totalUSDTWithdrawn = userInfo ? Number(userInfo.userTotalUSDTWithdrawn) / 1e6 : 0;
  const totalLevelBGP = userInfo ? Number(userInfo.userTotalLevelBGP) / 1e18 : 0; // 等级奖励已提现BGP
  const withdrawableBGP = userInfo ? Number(userInfo.userPendingLevelBGP) / 1e18 : 0; // 待提现的等级奖励BGP

  const playSound = () => {
    try {
      const audio = new Audio("/sound.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  // 刷新数据当领取成功时
  useEffect(() => {
    if (isClaimSuccess && pendingClaim) {
      playSound();
      refetchUserInfo();
      refetchClaimStatus();
      
      // 显示动画
      setOverlay({ open: true, usdt: pendingClaim.usdt, bgp: pendingClaim.bgp });
      
      // 清除待领取状态
      setPendingClaim(null);
    }
  }, [isClaimSuccess, pendingClaim, refetchUserInfo, refetchClaimStatus]);

  useEffect(() => {
    if (isWithdrawSuccess || isWithdrawBGPSuccess) {
      refetchUserInfo();
    }
  }, [isWithdrawSuccess, isWithdrawBGPSuccess, refetchUserInfo]);

  const nextLevel = useMemo(
    () => getNextLevelRequirement(totalContribution),
    [totalContribution]
  );

  const handleClaimLevel = (level: number, usdtReward: number, bgpReward: number) => {
    // 保存待领取的奖励信息
    setPendingClaim({ usdt: usdtReward, bgp: bgpReward });
    // 发起交易
    claimLevelReward(level);
  };

  const handleWithdrawUSDT = () => {
    withdrawUSDT();
  };

  // 检查等级是否已领取 (从合约读取)
  const checkIsClaimed = (level: number) => {
    // level 是 1-12, 数组索引是 0-11
    return claimedLevels[level - 1] || false;
  };

  return (
    <div className="relative min-h-screen">
      <DotPattern
        className="absolute inset-0 z-0"
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
      />
      <div className="absolute inset-0 bg-linear-to-b from-orange-500/5 via-transparent to-primary/5 z-0" />

      <div className="relative z-10 min-h-screen">
        <ClaimAnimationOverlay
          open={overlay.open}
          amountUSDT={overlay.usdt}
          amountBGP={overlay.bgp}
          autoCloseMs={null}
          onClose={() => setOverlay({ open: false })}
        />
        <div className="px-5 py-4">
          <SiteHeader />
        </div>

        <div className="px-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold mb-1 bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
              {t("rewards")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("rewardsOverview")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative bg-linear-to-br from-primary/20 via-orange-500/20 to-orange-600/20 backdrop-blur-md rounded-3xl p-6 border-2 border-primary/40 mb-6 overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/60" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/60" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary/60" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/60" />

            <motion.div
              className="absolute inset-0 bg-linear-to-r from-transparent via-primary/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 2,
              }}
            />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary via-orange-500 to-orange-600 flex items-center justify-center shadow-xl"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                  }}
                >
                  <Crown className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <span>{t("level")}</span>
                  </div>
                  <div className="text-4xl font-bold bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
                    V{displayLevel}
                  </div>
                  {nextLevel && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("nextAirdrop")}: V{nextLevel.v} (
                      {nextLevel.need.toLocaleString()})
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  {t("myContribution")}
                </div>
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {totalContribution.toLocaleString()}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="relative z-10 space-y-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {withdrawableBGP.toLocaleString()} BGP
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("bgpWithdrawable")}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-linear-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                  onClick={() => withdrawBGP()}
                  disabled={isWithdrawBGPPending || withdrawableBGP <= 0}
                >
                  <ArrowDownToLine className="w-4 h-4 mr-1" />
                  {isWithdrawBGPPending ? t("pending") : t("withdrawButton")}
                </Button>
              </div>
            </div>
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="relative z-10 space-y-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {withdrawableUSDT.toFixed(1)} U
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("usdtWithdrawable")}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-linear-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                  onClick={handleWithdrawUSDT}
                  disabled={withdrawableUSDT < 10 || isWithdrawPending}
                >
                  <ArrowDownToLine className="w-4 h-4 mr-1" />
                  {isWithdrawPending ? t("pending") : t("withdrawButton")}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 mb-6">
            <div className="text-sm font-semibold mb-3">V1 - V12</div>
            <div className="space-y-3">
              {LEVELS.map((lv) => {
                const reached = totalContribution >= lv.need;
                const isClaimed = checkIsClaimed(lv.v);
                const progress = Math.min(1, totalContribution / lv.need);
                const isCurrentLevel = lv.v === displayLevel;

                return (
                  <div
                    key={lv.v}
                    className={`rounded-xl border p-4 bg-background/30 backdrop-blur-sm transition-all ${
                      isCurrentLevel
                        ? "border-primary/60 bg-primary/10 shadow-lg"
                        : "border-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold flex items-center gap-2">
                        V{lv.v}
                        {isCurrentLevel && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/40">
                            {t("level")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("requiredContribution")}: {lv.need.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {t("usdtReward")}: {lv.usdt} USDT · {t("bgpReward")}:{" "}
                      {lv.bgp.toLocaleString()} BGP
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                      <div
                        className="h-full bg-linear-to-r from-primary to-orange-500"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {reached
                          ? isClaimed
                            ? t("claimed")
                            : t("claimable")
                          : t("notReached")}{" "}
                        • {Math.min(totalContribution, lv.need)}/{lv.need}
                      </div>
                      <Button
                        size="sm"
                        disabled={!reached || isClaimed || isClaimPending}
                        onClick={() => handleClaimLevel(lv.v, lv.usdt, lv.bgp)}
                        className="transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        {isClaimed ? t("claimed") : isClaimPending ? t("pending") : t("claim")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
