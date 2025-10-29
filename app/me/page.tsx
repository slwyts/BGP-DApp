"use client";

import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Calendar, Crown, TrendingUp, Activity } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Particles } from "@/components/ui/particles";
import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/activity-feed";

type ClaimRecord = {
  type: string;
  amount: number | string | null | undefined;
};

function isClaimRecord(value: unknown): value is ClaimRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: unknown; amount?: unknown };
  const typeOk = typeof v.type === "string";
  const amountOk =
    typeof v.amount === "number" ||
    typeof v.amount === "string" ||
    typeof v.amount === "undefined" ||
    v.amount === null;
  return typeOk && amountOk;
}

export default function MePage() {
  const { t } = useLocale();
  const address = "0x1234...5678";
  const network = "Arbitrum";
  const [totalBGPClaimed] = useState<number>(() => {
    try {
      const raw: unknown = JSON.parse(
        localStorage.getItem("claimRecords") || "[]",
      );
      if (Array.isArray(raw)) {
        return raw
          .filter(isClaimRecord)
          .filter((r) => r.type === "BGP")
          .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      }
    } catch {}
    return 0;
  });

  const loginDays = 45;
  const currentLevel = 3;
  const totalIncome = 1250.5;

  useEffect(() => {
    try {
      localStorage.setItem("walletAddress", address.toLowerCase());
    } catch {}
  }, [address]);

  // Removed IP fetch per spec

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-background via-primary/5 to-orange-500/10 z-0" />

      <Particles className="absolute inset-0 z-1" />
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
              {t("profile")}
            </h1>
          </motion.div>

          <div className="grid gap-4 mb-6">
            <div className="relative bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 overflow-hidden">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30" />
              <div className="text-sm text-muted-foreground">
                {t("wallet")} & {t("network")}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-lg font-semibold">{address}</div>
                <div className="text-sm text-muted-foreground">{network}</div>
              </div>
              <div className="mt-3">
                <Button
                  variant="outline"
                  className="transition-all duration-200 hover:scale-105 active:scale-95 bg-transparent"
                >
                  {t("disconnect")}
                </Button>
              </div>
            </div>

            {/* Removed IP display per spec */}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 mb-6"
          >
            <div className="relative bg-linear-to-br from-primary/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-4 border border-primary/30 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-orange-500 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {loginDays}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("loginDays")}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-linear-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-md rounded-2xl p-4 border border-orange-500/30 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/50" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-500">
                    V{currentLevel}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("currentLevel")}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-linear-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-4 border border-blue-500/30 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500/50" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">
                    {totalBGPClaimed}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("totalBGPClaimed")}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-linear-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-4 border border-green-500/30 overflow-hidden">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-500/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-500/50" />
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {totalIncome.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("totalIncome")}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          {/* Assets section removed per spec */}

          <div className="mt-6">
            {/* <h2 className="text-lg font-semibold mb-3">{t("recentTransactions")}</h2> */}
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
