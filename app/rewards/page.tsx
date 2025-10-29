"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Crown, TrendingUp, ArrowDownToLine } from "lucide-react";
import { ClaimAnimationOverlay } from "@/components/claim-animation-overlay";

type Level = {
  v: number;
  need: number;
  usdt: number;
  bgp: number;
};

const LEVELS: Level[] = [
  { v: 1, need: 10, usdt: 0.1, bgp: 200 },
  { v: 2, need: 50, usdt: 0.5, bgp: 200 },
  { v: 3, need: 100, usdt: 1, bgp: 200 },
  { v: 4, need: 500, usdt: 5, bgp: 2000 },
  { v: 5, need: 3000, usdt: 20, bgp: 8000 },
  { v: 6, need: 10000, usdt: 100, bgp: 10000 },
  { v: 7, need: 32000, usdt: 320, bgp: 30000 },
  { v: 8, need: 50000, usdt: 300, bgp: 50000 },
  { v: 9, need: 100000, usdt: 500, bgp: 100000 },
  { v: 10, need: 300000, usdt: 1000, bgp: 300000 },
  { v: 11, need: 502000, usdt: 2000, bgp: 500000 },
  { v: 12, need: 1000000, usdt: 10000, bgp: 1000000 },
];

export default function RewardsPage() {
  const { t } = useLocale();
  const totalContribution = 12650;
  const [claimed, setClaimed] = useState<number[]>([1, 2]);
  const withdrawableUSDT = 7.5;
  // Removed unused withdraw input state
  const [overlay, setOverlay] = useState<{
    open: boolean;
    usdt?: number;
    bgp?: number;
  }>({ open: false });
  const [records, setRecords] = useState<
    Array<{ type: "USDT" | "BGP"; amount: number; ts: number }>
  >([]);

  const playSound = () => {
    try {
      const audio = new Audio("/sound.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    let tid: number | undefined;
    try {
      const items = JSON.parse(localStorage.getItem("claimRecords") || "[]");
      if (Array.isArray(items)) {
        tid = window.setTimeout(() => {
          setRecords(items.slice().reverse());
        }, 0);
      }
    } catch {}
    return () => {
      if (tid !== undefined) clearTimeout(tid);
    };
  }, [overlay.open]);

  const currentLevel = LEVELS.reduce((level, lv) => {
    return totalContribution >= lv.need ? lv.v : level;
  }, 0);

  const nextLevel = LEVELS.find((lv) => lv.need > totalContribution);

  const markClaimed = (v: number, usdt: number, bgp: number, nowTs: number) => {
    setClaimed((arr) => Array.from(new Set([...arr, v])));
    playSound();
    setOverlay({ open: true, usdt, bgp });
    try {
      const key = "claimRecords";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [
        ...existing,
        { type: "USDT", amount: usdt, ts: nowTs },
        { type: "BGP", amount: bgp, ts: nowTs },
      ].slice(-100);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
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
                    V{currentLevel}
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
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="text-2xl font-bold text-primary relative z-10">
                {totalContribution.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground relative z-10">
                {t("myContribution")}
              </div>
            </div>
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
              <div className="relative z-10 space-y-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {withdrawableUSDT} U
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("usdtWithdrawable")}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-linear-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-1" />
                  {t("withdrawButton")}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 mb-6">
            <div className="text-sm font-semibold mb-3">V1 - V12</div>
            <div className="space-y-3">
              {LEVELS.map((lv) => {
                const reached = totalContribution >= lv.need;
                const isClaimed = claimed.includes(lv.v);
                const progress = Math.min(1, totalContribution / lv.need);
                const isCurrentLevel = lv.v === currentLevel;

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
                        disabled={!reached || isClaimed}
                        onClick={(e) =>
                          markClaimed(
                            lv.v,
                            lv.usdt,
                            lv.bgp,
                            Math.floor(
                              performance.timeOrigin + (e.timeStamp || 0),
                            ),
                          )
                        }
                        className="transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        {isClaimed ? t("claimed") : t("claim")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20">
            <div className="text-sm font-semibold mb-3">{t("rewards")}</div>
            {records.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No reward records yet.
              </div>
            ) : (
              <div className="space-y-2">
                {records.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-border p-3 bg-background/50"
                  >
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.ts).toLocaleString()}
                    </div>
                    <div className="text-sm font-semibold text-primary">
                      +{r.amount} {r.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
