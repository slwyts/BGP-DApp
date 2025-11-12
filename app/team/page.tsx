"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { Check, Copy, UserPlus } from "lucide-react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useUserInfo, useRegister, useDirectReferralsWithTime } from "@/lib/hooks/use-contracts";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { hashIP } from "@/lib/ip-hash";
import { DailyRewardAnimation } from "@/components/daily-reward-animation";

export default function TeamPage() {
  const { t } = useLocale();
  const { address } = useAccount();
  const { userInfo, refetch: refetchUserInfo } = useUserInfo();
  const { register, isPending, isSuccess, hash } = useRegister();
  const { addresses: referralAddresses, timestamps: referralTimestamps } = useDirectReferralsWithTime();
  const searchParams = useSearchParams();
  
  const [referrerInput, setReferrerInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showRewardAnim, setShowRewardAnim] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0); // 奖励金额
  
  // 检查 URL 中的 ref 参数
  useEffect(() => {
    const refParam = searchParams?.get("ref");
    if (refParam && isAddress(refParam)) {
      setReferrerInput(refParam);
      setShowInput(true);
    }
  }, [searchParams]);
  
  // 注册成功后刷新数据并显示奖励动画
  useEffect(() => {
    if (isSuccess) {
      refetchUserInfo();
      setShowInput(false);
      
      // TODO: 从交易回执事件中读取 isEarlyBird 和 bgpReward
      // 暂时假设前1万名用户都是早鸟，获得5000 BGP
      // 实际应该解析 Registered 事件的 isEarlyBird 和 bgpReward 参数
      const earlyBirdReward = 5000;
      setRewardAmount(earlyBirdReward);
      setShowRewardAnim(true);
    }
  }, [isSuccess, refetchUserInfo]);
  
  // 生成邀请码(使用地址后6位)
  const [inviteCode] = useState(() => 
    address ? address.slice(-6).toUpperCase() : "000000"
  );
  
  // 客户端挂载状态
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const inviteLink = useMemo(
    () =>
      mounted && typeof window !== "undefined"
        ? `${window.location.origin}/?ref=${address || "0x0"}`
        : `/?ref=${address || "0x0"}`,
    [address, mounted],
  );
  const [copied, setCopied] = useState(false);

  // 使用真实合约数据
  const teamTotal = userInfo ? Number(userInfo.userTeamSize) : 0;
  const direct = userInfo ? Number(userInfo.directReferralCount) : 0;
  const teamContribution = userInfo ? Number(userInfo.userContribution) : 0;
  
  // 检查是否已经绑定推荐人
  const isRegistered = userInfo && userInfo.userReferrer !== '0x0000000000000000000000000000000000000000';
  const currentReferrer = userInfo?.userReferrer || "";

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // 格式化地址为前4位...后4位
  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 格式化时间戳为日期
  const formatDate = (timestamp: bigint) => {
    if (!timestamp || timestamp === BigInt(0)) return '-';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  const handleRegister = async () => {
    if (!referrerInput) return;

    try {
      // 生成 IP hash
      const ipHash = await hashIP();
      console.log('✅ IP Hash 生成:', ipHash);
      register(referrerInput, ipHash);
    } catch (error) {
      console.error("❌ 注册失败:", error);
    }
  };

  return (
    <div className="relative min-h-screen">
      <GridPattern
        width={40}
        height={40}
        x={-1}
        y={-1}
        className="absolute inset-0 z-0"
        strokeDasharray="4 4"
      />
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-orange-500/5 z-0" />

      {/* 注册成功奖励动画 */}
      <DailyRewardAnimation
        open={showRewardAnim}
        onClose={() => setShowRewardAnim(false)}
        amount={rewardAmount}
        title={rewardAmount > 0 ? "🎉 早鸟奖励" : undefined}
        subtitle={rewardAmount > 0 ? "恭喜您获得前1万名早鸟奖励！" : undefined}
      />

      <div className="relative z-10 min-h-screen">
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
              {t("teamStats")}
            </h1>
            <p className="text-muted-foreground text-sm">{t("inviteRules")}</p>
          </motion.div>

          <div className="grid gap-4 mb-6">
            {/* 邀请人绑定区域 */}
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/30" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/30" />
              <div className="text-sm text-muted-foreground mb-1">
                邀请人地址
              </div>
              
              {isRegistered ? (
                // 已绑定状态
                <div className="flex items-center gap-2">
                  <div className="text-sm font-mono text-green-500 truncate flex-1">
                    {currentReferrer}
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500">
                    已绑定
                  </div>
                </div>
              ) : (
                // 未绑定状态
                <div className="space-y-2">
                  {showInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={referrerInput}
                        onChange={(e) => setReferrerInput(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-3 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Button
                        size="sm"
                        onClick={handleRegister}
                        disabled={isPending || !referrerInput}
                        className="transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {isPending ? "绑定中..." : "确认绑定"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground flex-1">
                        未绑定邀请人
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowInput(true)}
                        className="transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        绑定邀请人
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 邀请链接区域 */}
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/30" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/30" />
              <div className="text-sm text-muted-foreground mb-1">
                {t("inviteLink")}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm truncate">{inviteLink}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(inviteLink)}
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {copied ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copied ? t("copied") : t("copy")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="text-2xl font-bold text-primary">{teamTotal}</div>
              <div className="text-xs text-muted-foreground">
                {t("teamTotal")}
              </div>
            </div>
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="text-2xl font-bold text-primary">{direct}</div>
              <div className="text-xs text-muted-foreground">
                {t("directReferrals")}
              </div>
            </div>
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="text-2xl font-bold text-primary">
                {teamContribution}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("teamContribution")}
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20">
            <div className="text-sm font-semibold mb-3">我的邀请</div>
            <div className="grid grid-cols-1 gap-2">
              {referralAddresses && referralAddresses.length > 0 ? (
                referralAddresses.map((addr, index) => (
                  <div
                    key={`${addr}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-border p-3 bg-background/50"
                  >
                    <div className="text-sm font-mono text-primary">
                      {formatAddress(addr)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(referralTimestamps[index])}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-6">
                  暂无直推用户
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
