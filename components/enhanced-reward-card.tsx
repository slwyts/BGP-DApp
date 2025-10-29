"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EnhancedRewardCardProps {
  title: string;
  subtitle: string;
  buttonText: string;
  icon: LucideIcon;
  delay: number;
  onClaim?: () => void;
}

export function EnhancedRewardCard({
  title,
  subtitle,
  buttonText,
  icon: Icon,
  delay,
  onClaim,
}: EnhancedRewardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="relative group"
    >
      <div className="absolute -inset-2 bg-linear-to-r from-primary via-orange-500 to-orange-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-300" />

      <div className="relative overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-primary/20 p-5 shadow-xl">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/30" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary/30" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary/30" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/30" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-linear-to-br from-primary via-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <motion.h2
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.05 }}
                className="text-2xl font-bold leading-7 bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent"
              >
                {title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 }}
                className="text-sm text-muted-foreground wrap-break-word"
              >
                {subtitle}
              </motion.p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="w-full sm:w-auto shrink-0"
          >
            <Button
              className="w-full sm:w-auto bg-linear-to-r from-primary via-orange-500 to-orange-600 hover:from-primary/90 hover:via-orange-500/90 hover:to-orange-600/90 text-white border-0 px-6 py-5 text-base font-semibold shadow-xl rounded-xl whitespace-nowrap"
              onClick={onClaim}
            >
              {buttonText}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
