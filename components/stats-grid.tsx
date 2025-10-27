"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Activity, DollarSign } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function StatsGrid() {
  const { t } = useLocale();

  const stats = [
    {
      icon: TrendingUp,
      label: t("totalRewards"),
      value: "125,430",
      unit: "BLA",
      gradient: "from-primary to-orange-500",
      bgGradient: "from-primary/10 to-orange-500/10",
    },
    {
      icon: Users,
      label: t("activeUsers"),
      value: "8,234",
      unit: "",
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-500/10 to-orange-600/10",
    },
    {
      icon: Activity,
      label: t("transactions"),
      value: "45,123",
      unit: "",
      gradient: "from-primary to-orange-400",
      bgGradient: "from-primary/10 to-orange-400/10",
    },
    {
      icon: DollarSign,
      label: t("volume"),
      value: "$2.4M",
      unit: "",
      gradient: "from-orange-600 to-primary",
      bgGradient: "from-orange-600/10 to-primary/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="space-y-5"
    >
      <h2 className="text-3xl font-bold text-foreground mb-4">
        Platform Stats
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
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

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <motion.div
                    className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-lg shrink-0`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </motion.div>

                  <div className="text-xs text-muted-foreground font-medium leading-tight min-w-0">
                    {stat.label}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground whitespace-nowrap">
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
    </motion.div>
  );
}
