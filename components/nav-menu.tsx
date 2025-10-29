"use client";

import { motion } from "motion/react";
import { Box, Layers, Zap, Crown } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function NavMenu() {
  const { t } = useLocale();

  const menuItems = [
    { icon: Box, label: t("protocol"), color: "from-primary to-orange-500" },
    // Swap DEX and SWAP positions
    { icon: Zap, label: t("swap"), color: "from-primary to-orange-400" },
    { icon: Layers, label: t("dex"), color: "from-orange-500 to-orange-600" },
    { icon: Crown, label: t("lending"), color: "from-orange-600 to-primary" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {menuItems.map((item, index) => (
        <motion.button
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 + index * 0.05 }}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="relative flex flex-col items-center gap-3 p-5 rounded-2xl bg-linear-to-br from-card/60 to-card/30 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all shadow-lg hover:shadow-xl group"
        >
          <div
            className={`absolute -inset-1 bg-linear-to-br ${item.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
          />

          <motion.div
            whileHover={{ rotate: 15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`relative w-14 h-14 rounded-xl bg-linear-to-br ${item.color} flex items-center justify-center shadow-lg`}
          >
            <item.icon className="w-7 h-7 text-white" />
          </motion.div>

          <span className="text-sm text-foreground font-semibold relative z-10">
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
