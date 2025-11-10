"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { Check, Copy, UserPlus } from "lucide-react";
import { GridPattern } from "@/components/ui/grid-pattern";
import { useUserInfo, useRegister } from "@/lib/hooks/use-contracts";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { isAddress } from "viem";
import { hashIP } from "@/lib/ip-hash";

export default function TeamPage() {
  const { t } = useLocale();
  const { address } = useAccount();
  const { userInfo, refetch: refetchUserInfo } = useUserInfo();
  const { register, isPending, isSuccess } = useRegister();
  const searchParams = useSearchParams();
  
  const [referrerInput, setReferrerInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  
  // 检查 URL 中的 ref 参数
  useEffect(() => {
    const refParam = searchParams?.get("ref");
    if (refParam && isAddress(refParam)) {
      setReferrerInput(refParam);
      setShowInput(true);
    }
  }, [searchParams]);
  
  // 注册成功后刷新数据
  useEffect(() => {
    if (isSuccess) {
      refetchUserInfo();
      setShowInput(false);
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

  const levels = [
    { depth: 1, bgp: 800, contrib: 8 },
    { depth: 2, bgp: 400, contrib: 4 },
    { depth: 3, bgp: 200, contrib: 2 },
    { depth: 4, bgp: 100, contrib: 1 },
    { depth: 5, bgp: 100, contrib: 1 },
    { depth: 6, bgp: 100, contrib: 1 },
    { depth: 7, bgp: 100, contrib: 1 },
    { depth: 8, bgp: 100, contrib: 1 },
    { depth: 9, bgp: 100, contrib: 1 },
    { depth: 10, bgp: 100, contrib: 1 },
    { depth: 11, bgp: 100, contrib: 1 },
    { depth: 12, bgp: 100, contrib: 1 },
    { depth: 13, bgp: 100, contrib: 1 },
    { depth: 14, bgp: 100, contrib: 1 },
    { depth: 15, bgp: 100, contrib: 1 },
  ];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  
  const handleRegister = async () => {
    if (!referrerInput) return;

    if (!isAddress(referrerInput)) {
      alert("无效的邀请人地址格式");
      return;
    }

    if (address && referrerInput.toLowerCase() === address.toLowerCase()) {
      alert("不能邀请自己");
      return;
    }

    try {
      // 生成 IP hash
      const ipHash = await hashIP();
      console.log('✅ IP Hash 生成:', ipHash);
      register(referrerInput, ipHash);
    } catch (error) {
      console.error("❌ 注册失败:", error);
      alert("注册失败，请重试");
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
              {levels.map((lv) => (
                <div
                  key={lv.depth}
                  className="flex items-center justify-between rounded-xl border border-border p-3 bg-background/50"
                >
                  <div className="text-sm">L{lv.depth}</div>
                  <div className="text-xs text-muted-foreground">
                    BGP {lv.bgp}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("myContribution")} +{lv.contrib}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
