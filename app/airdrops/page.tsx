"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { Timer, Sparkles, Zap, Rocket, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobeAirdrop } from "@/components/globe-airdrop";
import { WarpBackground } from "@/components/ui/warp-background";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { ClaimAnimationOverlay } from "@/components/claim-animation-overlay";
import { DailyRewardAnimation } from "@/components/daily-reward-animation";
import { StatsGrid } from "@/components/stats-grid";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { getAirdropStatus, claimAirdrop } from "@/lib/airdrop-client";

export default function HomePage() {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"ready" | "pending" | "cooldown">(
    "ready",
  );
  const [cooldown, setCooldown] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  // Removed unused claim animation state
  const [claimOverlay, setClaimOverlay] = useState<{
    open: boolean;
    usdt?: number;
    bgp?: number;
  }>({ open: false });
  const [showDailyRewardAnim, setShowDailyRewardAnim] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  // In-site popup for "Add BGP to Wallet"
  const [showAddBGPDialog, setShowAddBGPDialog] = useState(false);

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
  const [serverNext, setServerNext] = useState<number | null>(null);

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

  // Removed unused dayString helper

  const addRecord = (type: "BGP" | "USDT", amount: number) => {
    try {
      const key = "claimRecords";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [...existing, { type, amount, ts: Date.now() }].slice(-100);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  // Removed unused addTokenToWallet helper

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // 客户端状态检查（替代服务器 API）
  const fetchStatus = useCallback(() => {
    try {
      const addr =
        (typeof window !== "undefined" &&
          localStorage.getItem("walletAddress")) ||
        "anon";
      const data = getAirdropStatus(addr);
      setTodayCount(data.claimsToday || 0);
      setServerNext(data.next || null);
      const now = Date.now();
      const diff = data.next
        ? Math.max(0, Math.ceil((data.next - now) / 1000))
        : 0;
      setCooldown(data.claimable ? 0 : diff);
      setStatus(data.claimable ? "ready" : "cooldown");
    } catch {
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    // Schedule to avoid synchronous setState in effect body
    const id = setTimeout(() => {
      void fetchStatus();
    }, 0);
    return () => clearTimeout(id);
  }, [fetchStatus]);

  useEffect(() => {
    if (status !== "cooldown") return;
    const id = setInterval(() => {
      setCooldown((c) => {
        const next = Math.max(0, c - 1);
        if (next === 0) fetchStatus();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status, fetchStatus]);

  // Reset daily count on day change while page is open
  useEffect(() => {
    const id = setInterval(() => {
      void fetchStatus();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const onInteract = () => {
    if (status !== "ready") return;
    setStatus("pending");
    try {
      const addr =
        (typeof window !== "undefined" &&
          localStorage.getItem("walletAddress")) ||
        "anon";
      const data = claimAirdrop(addr);
      if (!data.success) {
        fetchStatus();
        setStatus("cooldown");
        return;
      }
      setShowDailyRewardAnim(true);
      setTimeout(() => {
        setShowDailyRewardAnim(false);
        onClaim({ usdt: data.payout?.usdt, bgp: data.payout?.bgp });
        setTodayCount(data.claimsToday || 0);
        if (data.next) {
          const diff = Math.max(0, Math.ceil((data.next - Date.now()) / 1000));
          setCooldown(diff);
          setStatus("cooldown");
        } else {
          fetchStatus();
        }
      }, 1200);
    } catch {
      setStatus("ready");
    }
  };

  const nextSlotLabel = useMemo(() => {
    if (todayCount >= dailyLimit) return "00:00";
    if (!serverNext) return "";
    const h = new Date(serverNext).getHours();
    return h === 12 ? "12:00" : "00:00";
  }, [serverNext, todayCount]);

  const onClaim = (payout?: { usdt?: number; bgp?: number }) => {
    playSound();
    setClaimOverlay({ open: true, usdt: payout?.usdt, bgp: payout?.bgp });
    if (payout?.bgp) addRecord("BGP", payout.bgp);
    if (payout?.usdt) addRecord("USDT", payout.usdt);
  };

  // Removed unused randomAddress helper

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
        />

        {/* Simple in-site dialog */}
        {showAddBGPDialog && (
          <div
            className="fixed inset-0 z-2000 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowAddBGPDialog(false)}
          >
            <div
              className="bg-background rounded-lg border p-6 w-full max-w-sm text-center shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
                {t("addBGPToWallet")}
              </h3>
              <p className="text-base text-foreground/90 pt-4">
                {t("addBGPNotDeveloped")}
              </p>
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setShowAddBGPDialog(false)}>OK</Button>
              </div>
            </div>
          </div>
        )}

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
                      <>resets at {nextSlotLabel || "00:00"}</>
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
                          i < todayCount
                            ? "bg-linear-to-r from-primary to-orange-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-primary ml-1">
                    {todayCount}/{dailyLimit}
                  </span>
                </div>
              </motion.div>

              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  className="w-full max-w-xs bg-transparent"
                  onClick={() => setShowAddBGPDialog(true)}
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
