"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Shield,
  Pause,
  Play,
  AlertTriangle,
  Settings,
  Wallet,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Ban,
  Search,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { WarpBackground } from "@/components/ui/warp-background";
import {
  useIsOwner,
  useContractPaused,
  usePauseContract,
  useSetAutoLevelCheck,
  useEmergencyWithdraw,
  useGlobalStats,
  useAntiSybilStats,
  useAntiSybilPause,
  useAddressBlacklist,
  useCheckBlacklisted,
  useAddressToIP,
} from "@/lib/hooks/use-contracts";
import { useAccount } from "wagmi";
import { getContractAddresses } from "@/lib/contracts/addresses";

export default function AdminPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();
  const { isOwner, ownerAddress, isLoading: isOwnerLoading } = useIsOwner();
  const { isPaused, refetch: refetchPaused } = useContractPaused();
  const {
    pause,
    unpause,
    isPending: isPausePending,
    isSuccess: isPauseSuccess,
  } = usePauseContract();
  const {
    autoLevelCheck,
    setAutoLevelCheck,
    isPending: isAutoLevelPending,
    isSuccess: isAutoLevelSuccess,
    refetch: refetchAutoLevel,
  } = useSetAutoLevelCheck();
  const {
    emergencyWithdrawETH,
    emergencyWithdrawToken,
    isPending: isEmergencyPending,
  } = useEmergencyWithdraw();
  const { totalInteractions, totalParticipants, contractBalance, usdtBalance } =
    useGlobalStats();
  const addresses = getContractAddresses();

  // AntiSybil hooks
  const {
    totalRegistered: antiSybilRegistered,
    totalUniqueIPs,
    maxPerIP,
    isPaused: isAntiSybilPaused,
    antiSybilAddress,
    refetch: refetchAntiSybil,
  } = useAntiSybilStats();
  const {
    pause: pauseAntiSybil,
    unpause: unpauseAntiSybil,
    isPending: isAntiSybilPausePending,
    isSuccess: isAntiSybilPauseSuccess,
  } = useAntiSybilPause();
  const {
    blacklistAddress,
    removeFromBlacklist,
    isPending: isBlacklistPending,
    isSuccess: isBlacklistSuccess,
  } = useAddressBlacklist();

  // 查询地址状态
  const [queryAddress, setQueryAddress] = useState("");
  const [activeQueryAddress, setActiveQueryAddress] = useState("");
  const { isBlacklisted: queriedBlacklisted, refetch: refetchBlacklisted } =
    useCheckBlacklisted(activeQueryAddress || undefined);
  const { ipAddr: queriedIP } = useAddressToIP(activeQueryAddress || undefined);

  // 黑名单操作
  const [blacklistInput, setBlacklistInput] = useState("");
  const [blacklistReason, setBlacklistReason] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPauseSuccess) {
      refetchPaused();
    }
  }, [isPauseSuccess, refetchPaused]);

  useEffect(() => {
    if (isAutoLevelSuccess) {
      refetchAutoLevel();
    }
  }, [isAutoLevelSuccess, refetchAutoLevel]);

  useEffect(() => {
    if (isAntiSybilPauseSuccess) {
      refetchAntiSybil();
    }
  }, [isAntiSybilPauseSuccess, refetchAntiSybil]);

  useEffect(() => {
    if (isBlacklistSuccess) {
      refetchBlacklisted();
      setBlacklistInput("");
      setBlacklistReason("");
    }
  }, [isBlacklistSuccess, refetchBlacklisted]);

  const handleQueryAddress = () => {
    if (queryAddress && queryAddress.startsWith("0x")) {
      setActiveQueryAddress(queryAddress);
    }
  };

  const handleBlacklistAddress = () => {
    if (blacklistInput && blacklistInput.startsWith("0x") && blacklistReason) {
      blacklistAddress(blacklistInput, blacklistReason);
    }
  };

  const handleRemoveFromBlacklist = () => {
    if (blacklistInput && blacklistInput.startsWith("0x")) {
      removeFromBlacklist(blacklistInput);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <WarpBackground
        perspective={100}
        beamsPerSide={2}
        beamSize={6}
        beamDuration={6}
        gridColor="rgba(255, 140, 50, 0.12)"
        className="min-h-screen"
      >
        <div className="min-h-screen text-foreground">
          <SiteHeader />
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center space-y-4">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-xl text-muted-foreground">{t("connectWallet")}</p>
            </div>
          </div>
        </div>
      </WarpBackground>
    );
  }

  if (isOwnerLoading) {
    return (
      <WarpBackground
        perspective={100}
        beamsPerSide={2}
        beamSize={6}
        beamDuration={6}
        gridColor="rgba(255, 140, 50, 0.12)"
        className="min-h-screen"
      >
        <div className="min-h-screen text-foreground">
          <SiteHeader />
          <div className="flex items-center justify-center min-h-[80vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </WarpBackground>
    );
  }

  if (!isOwner) {
    return (
      <WarpBackground
        perspective={100}
        beamsPerSide={2}
        beamSize={6}
        beamDuration={6}
        gridColor="rgba(255, 140, 50, 0.12)"
        className="min-h-screen"
      >
        <div className="min-h-screen text-foreground">
          <SiteHeader />
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center space-y-4">
              <Shield className="w-16 h-16 mx-auto text-red-500" />
              <p className="text-xl text-muted-foreground">{t("adminAccessDenied")}</p>
              <Button variant="outline" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToHome")}
              </Button>
            </div>
          </div>
        </div>
      </WarpBackground>
    );
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
      <div className="min-h-screen text-foreground">
        <SiteHeader />

        <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("adminPanel")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("adminPanelDesc")}
              </p>
            </div>
          </motion.div>

          {/* Contract Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card/40 backdrop-blur-md rounded-2xl border border-primary/20 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t("contractStatus")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("totalParticipatingAddresses")}</p>
                <p className="text-2xl font-bold text-primary">{totalParticipants}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("totalInteractions")}</p>
                <p className="text-2xl font-bold text-primary">{totalInteractions}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("contractETH")}</p>
                <p className="text-2xl font-bold text-primary">
                  {parseFloat(contractBalance).toFixed(4)}
                </p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("contractUSDT")}</p>
                <p className="text-2xl font-bold text-primary">
                  {usdtBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Contract Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card/40 backdrop-blur-md rounded-2xl border border-primary/20 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t("contractControls")}
            </h2>
            <div className="space-y-4">
              {/* Pause/Unpause */}
              <div className="flex items-center justify-between bg-background/50 rounded-xl p-4">
                <div>
                  <p className="font-medium">{t("contractPauseStatus")}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPaused ? t("contractIsPaused") : t("contractIsRunning")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <CheckCircle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  <Button
                    variant={isPaused ? "default" : "destructive"}
                    onClick={() => (isPaused ? unpause() : pause())}
                    disabled={isPausePending}
                  >
                    {isPausePending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isPaused ? (
                      <Play className="w-4 h-4 mr-2" />
                    ) : (
                      <Pause className="w-4 h-4 mr-2" />
                    )}
                    {isPaused ? t("resumeContract") : t("pauseContract")}
                  </Button>
                </div>
              </div>

              {/* Auto Level Check */}
              <div className="flex items-center justify-between bg-background/50 rounded-xl p-4">
                <div>
                  <p className="font-medium">{t("autoLevelCheck")}</p>
                  <p className="text-sm text-muted-foreground">
                    {autoLevelCheck ? t("autoLevelEnabled") : t("autoLevelDisabled")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {autoLevelCheck ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setAutoLevelCheck(!autoLevelCheck)}
                    disabled={isAutoLevelPending}
                  >
                    {isAutoLevelPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {autoLevelCheck ? t("disable") : t("enable")}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AntiSybil Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card/40 backdrop-blur-md rounded-2xl border border-primary/20 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserX className="w-5 h-5 text-primary" />
              {t("antiSybilManagement")}
            </h2>

            {/* AntiSybil Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("registeredAddresses")}</p>
                <p className="text-2xl font-bold text-primary">{antiSybilRegistered}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("uniqueIPs")}</p>
                <p className="text-2xl font-bold text-primary">{totalUniqueIPs}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("maxAddressesPerIP")}</p>
                <p className="text-2xl font-bold text-primary">{maxPerIP}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">{t("antiSybilStatus")}</p>
                <p className={`text-lg font-bold ${isAntiSybilPaused ? "text-yellow-500" : "text-green-500"}`}>
                  {isAntiSybilPaused ? t("paused") : t("running")}
                </p>
              </div>
            </div>

            {/* AntiSybil Pause Control */}
            <div className="flex items-center justify-between bg-background/50 rounded-xl p-4 mb-4">
              <div>
                <p className="font-medium">{t("antiSybilPauseStatus")}</p>
                <p className="text-sm text-muted-foreground">
                  {isAntiSybilPaused ? t("antiSybilIsPaused") : t("antiSybilIsRunning")}
                </p>
              </div>
              <Button
                variant={isAntiSybilPaused ? "default" : "destructive"}
                onClick={() => (isAntiSybilPaused ? unpauseAntiSybil() : pauseAntiSybil())}
                disabled={isAntiSybilPausePending}
              >
                {isAntiSybilPausePending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isAntiSybilPaused ? (
                  <Play className="w-4 h-4 mr-2" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                {isAntiSybilPaused ? t("resumeContract") : t("pauseContract")}
              </Button>
            </div>

            {/* Query Address */}
            <div className="bg-background/50 rounded-xl p-4 mb-4">
              <p className="font-medium mb-3">{t("queryAddress")}</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={queryAddress}
                  onChange={(e) => setQueryAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                />
                <Button onClick={handleQueryAddress} variant="outline">
                  <Search className="w-4 h-4 mr-2" />
                  {t("query")}
                </Button>
              </div>
              {activeQueryAddress && (
                <div className="bg-background/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("blacklistStatus")}:</span>
                    {queriedBlacklisted ? (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        <Ban className="w-4 h-4" /> {t("blacklisted")}
                      </span>
                    ) : (
                      <span className="text-green-500 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> {t("notBlacklisted")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("associatedIP")}:</span>
                    <span className="font-mono text-sm">
                      {queriedIP && queriedIP !== "0x00000000000000000000000000000000"
                        ? queriedIP
                        : t("noIPRecord")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Blacklist Management */}
            <div className="bg-background/50 rounded-xl p-4">
              <p className="font-medium mb-3">{t("blacklistManagement")}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={blacklistInput}
                  onChange={(e) => setBlacklistInput(e.target.value)}
                  placeholder={t("addressToBlacklist")}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                />
                <input
                  type="text"
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  placeholder={t("blacklistReason")}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleBlacklistAddress}
                    disabled={isBlacklistPending || !blacklistInput || !blacklistReason}
                  >
                    {isBlacklistPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Ban className="w-4 h-4 mr-2" />
                    )}
                    {t("addToBlacklist")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRemoveFromBlacklist}
                    disabled={isBlacklistPending || !blacklistInput}
                  >
                    {isBlacklistPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {t("removeFromBlacklist")}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Emergency Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/40 backdrop-blur-md rounded-2xl border border-red-500/30 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              {t("emergencyActions")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("emergencyWarning")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                onClick={() => emergencyWithdrawETH()}
                disabled={isEmergencyPending}
              >
                {isEmergencyPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                {t("emergencyWithdrawETH")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => emergencyWithdrawToken(addresses.usdt)}
                disabled={isEmergencyPending}
              >
                {isEmergencyPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                {t("emergencyWithdrawUSDT")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => emergencyWithdrawToken(addresses.bgpToken)}
                disabled={isEmergencyPending}
              >
                {isEmergencyPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                {t("emergencyWithdrawBGP")}
              </Button>
            </div>
          </motion.div>

          {/* Contract Addresses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card/40 backdrop-blur-md rounded-2xl border border-primary/20 p-6"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t("contractAddresses")}
            </h2>
            <div className="space-y-3">
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-mono text-sm break-all">{ownerAddress}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">DApp</p>
                <p className="font-mono text-sm break-all">{addresses.dapp}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">BGP Token</p>
                <p className="font-mono text-sm break-all">{addresses.bgpToken}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">USDT</p>
                <p className="font-mono text-sm break-all">{addresses.usdt}</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">AntiSybil</p>
                <p className="font-mono text-sm break-all">{antiSybilAddress}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </WarpBackground>
  );
}
