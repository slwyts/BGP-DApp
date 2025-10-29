"use client";

import { motion } from "motion/react";
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Globe,
  User,
  Award,
  Calendar,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function StatsGrid() {
  const { t } = useLocale();

  const globalStats = [
    {
      icon: Users,
      label: t("totalParticipatingAddresses"),
      value: "8,234",
      unit: "",
      gradient: "from-primary to-orange-500",
      bgGradient: "from-primary/10 to-orange-500/10",
    },
    {
      icon: Activity,
      label: t("totalInteractions"),
      value: "45,123",
      unit: "",
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-500/10 to-orange-600/10",
    },
  ];

  const personalStats = [
    {
      icon: User,
      label: t("personalCumulativeInteractions"),
      value: "127",
      unit: "",
      gradient: "from-primary to-orange-400",
      bgGradient: "from-primary/10 to-orange-400/10",
    },
    {
      icon: Calendar,
      label: t("activeDays"),
      value: "23",
      unit: "",
      gradient: "from-orange-600 to-primary",
      bgGradient: "from-orange-600/10 to-primary/10",
    },
    {
      icon: DollarSign,
      label: t("totalInteractionRewards"),
      value: "12.5",
      unit: "USDT",
      gradient: "from-primary to-orange-500",
      bgGradient: "from-primary/10 to-orange-500/10",
    },
    {
      icon: Award,
      label: t("levelAchievementRewards"),
      value: "5.0",
      unit: "USDT",
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-500/10 to-orange-600/10",
    },
    {
      icon: TrendingUp,
      label: t("level"),
      value: "V3",
      unit: "",
      gradient: "from-primary to-orange-400",
      bgGradient: "from-primary/10 to-orange-400/10",
    },
    {
      icon: DollarSign,
      label: t("cumulativeRewards"),
      value: "17.5",
      unit: "USDT",
      gradient: "from-orange-600 to-primary",
      bgGradient: "from-orange-600/10 to-primary/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="space-y-6"
    >
      {/* Global Data Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          {t("globalData")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {globalStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative group"
            >
              <div
                className={`absolute -inset-1 bg-linear-to-br ${stat.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
              />

              <div className="relative bg-card/20 backdrop-blur-md rounded-2xl p-4 border border-primary/20 shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/30" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30" />

                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 4 + index,
                  }}
                />

                <div className="relative z-10 flex flex-col items-start gap-2 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className={`w-9 h-9 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-lg shrink-0`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <stat.icon className="w-4 h-4 text-white" />
                    </motion.div>
                    <div className="text-xs text-muted-foreground font-medium leading-tight min-w-0">
                      {stat.label}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    {stat.unit && (
                      <div className="text-xs text-muted-foreground">
                        {stat.unit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Personal Data Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {t("personalData")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {personalStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="relative group"
            >
              <div
                className={`absolute -inset-1 bg-linear-to-br ${stat.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
              />

              <div className="relative bg-card/20 backdrop-blur-md rounded-2xl p-4 border border-primary/20 shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/30" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-primary/30" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-primary/30" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/30" />

                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 4 + index,
                  }}
                />

                <div className="relative z-10 flex flex-col items-start gap-2 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className={`w-9 h-9 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-lg shrink-0`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <stat.icon className="w-4 h-4 text-white" />
                    </motion.div>
                    <div className="text-xs text-muted-foreground font-medium leading-tight min-w-0">
                      {stat.label}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    {stat.unit && (
                      <div className="text-xs text-muted-foreground">
                        {stat.unit}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
