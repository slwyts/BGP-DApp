"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingUp, Repeat, Gift } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function ActivityFeed() {
  const { t } = useLocale();

  const recentActivity = [
    {
      user: "0x1234...5678",
      action: "Claimed",
      amount: "250 BGP",
      time: "2m ago",
      icon: Gift,
    },
    {
      user: "0x8765...4321",
      action: "Staked",
      amount: "1000 USDT",
      time: "5m ago",
      icon: TrendingUp,
    },
    {
      user: "0xabcd...efgh",
      action: "Swapped",
      amount: "500 BGP",
      time: "8m ago",
      icon: Repeat,
    },
    {
      user: "0x9876...1234",
      action: "Claimed",
      amount: "180 BGP",
      time: "12m ago",
      icon: Gift,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="relative"
    >
      <div className="absolute -inset-2 bg-linear-to-r from-primary/20 via-orange-500/20 to-transparent rounded-3xl blur-3xl opacity-60" />

      <div className="relative bg-card/20 backdrop-blur-md rounded-3xl p-7 border border-primary/20 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-primary/40" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <h2 className="text-3xl font-bold text-foreground">
            {t("recentActivity")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-accent group"
          >
            View All
            <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </div>

        <div className="space-y-3 relative z-10">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              whileHover={{ x: 6, scale: 1.02 }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-muted/20 hover:bg-muted/30 backdrop-blur-sm transition-all duration-300 border border-transparent hover:border-primary/30 group"
            >
              <motion.div
                className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shrink-0 relative overflow-hidden"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 0.3,
                  }}
                />
                <activity.icon className="w-6 h-6 text-white relative z-10" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {activity.user}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {activity.action}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-primary">
                  {activity.amount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activity.time}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
