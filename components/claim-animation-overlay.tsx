"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { Sparkles, Gift, TrendingUp, Zap, Star, Award } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface ClaimAnimationOverlayProps {
  open: boolean;
  onClose?: () => void;
  autoCloseMs?: number | null;
  amountUSDT?: number;
  amountBGP?: number;
  closable?: boolean;
}

export function ClaimAnimationOverlay({
  open,
  onClose,
  autoCloseMs = 7000,
  amountUSDT,
  amountBGP,
  closable = true,
}: ClaimAnimationOverlayProps) {
  const { t } = useLocale();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (autoCloseMs && autoCloseMs > 0) {
      timeoutRef.current = window.setTimeout(() => {
        onClose?.();
      }, autoCloseMs);
    }
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [open, autoCloseMs, onClose]);

  const [confetti] = useState(() => {
    const pieces: Array<{
      left: number;
      size: number;
      hue: number;
      delay: number;
      duration: number;
      rotate: number;
      drift: number;
    }> = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      pieces.push({
        left: Math.random() * 100,
        size: 6 + Math.random() * 16,
        hue: [24, 35, 45, 160, 200, 260][Math.floor(Math.random() * 6)],
        delay: Math.random() * 0.3 + i * 0.006,
        duration: 1.5 + Math.random() * 1,
        rotate: (Math.random() - 0.5) * 360,
        drift: (Math.random() - 0.5) * 150,
      });
    }
    return pieces;
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 pointer-events-auto flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255, 140, 50, 0.4) 0%, rgba(255, 100, 30, 0.25) 25%, rgba(0,0,0,0.8) 60%)",
              backdropFilter: "blur(8px)",
            }}
          />

          <div className="relative z-10" onClick={() => closable && onClose?.()}>
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={`ring-${i}`}
                className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border-4"
                style={{
                  width: 250 + i * 100,
                  height: 250 + i * 100,
                  borderColor: `rgba(255, 140, 50, ${0.5 - i * 0.1})`,
                }}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, delay: i * 0.08, ease: "easeOut" }}
              />
            ))}

            <motion.div
              className="absolute inset-0 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full"
              style={{
                width: 400,
                height: 400,
                background:
                  "radial-gradient(circle, rgba(255,140,50,0.7), rgba(255,140,50,0.3), transparent)",
                boxShadow:
                  "0 0 150px rgba(255,140,50,0.8), 0 0 250px rgba(255,140,50,0.5)",
              }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1.5, opacity: [0, 1, 0.5, 0] }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

            <motion.div
              className="relative z-20 flex flex-col items-center gap-6"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                className="w-32 h-32 rounded-3xl bg-linear-to-br from-primary via-orange-500 to-orange-600 flex items-center justify-center shadow-2xl relative overflow-hidden"
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1, repeat: 2 }}
                />
                <Gift className="w-16 h-16 text-white relative z-10" />
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <motion.h2
                  className="text-6xl font-bold text-white mb-3 flex items-center gap-3"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Sparkles className="w-10 h-10 text-primary" />
                  {t("claimedSuccess")}
                  <Sparkles className="w-10 h-10 text-primary" />
                </motion.h2>
                <motion.div
                  className="text-2xl text-white/90 font-semibold space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div>{t("rewardsAddedToBalance")}</div>
                  {(amountUSDT || amountBGP) && (
                    <div className="text-xl text-white/80">
                      {amountUSDT ? `+${amountUSDT} USDT` : ""}
                      {amountUSDT && amountBGP ? " · " : ""}
                      {amountBGP ? `+${amountBGP} BGP` : ""}
                    </div>
                  )}
                  {closable && (
                    <div className="text-sm text-white/70">Tap anywhere to close</div>
                  )}
                </motion.div>
              </motion.div>

              {[Gift, TrendingUp, Sparkles, Zap, Star, Award].map((Icon, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${50 + Math.cos((i * 2 * Math.PI) / 6) * 180}%`,
                    top: `${50 + Math.sin((i * 2 * Math.PI) / 6) * 180}%`,
                  }}
                  initial={{ scale: 0, opacity: 0, rotate: 0 }}
                  animate={{
                    scale: [0, 1.5, 1.2, 0],
                    opacity: [0, 1, 1, 0],
                    y: [0, -50, -60],
                    rotate: [0, 90, 180],
                  }}
                  transition={{ duration: 1.5, delay: 0.4 + i * 0.08 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-orange-500 flex items-center justify-center shadow-xl">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={`spark-${i}`}
                className="absolute left-1/2 top-1/2 origin-bottom"
                style={{
                  width: 4,
                  height: 80,
                  background:
                    "linear-gradient(to top, rgba(255,140,50,1), rgba(255,200,100,0.5), transparent)",
                  transform: `rotate(${i * (360 / 24)}deg)`,
                  transformOrigin: "bottom center",
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1,
                  delay: 0.15 + i * 0.015,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 overflow-hidden">
            {confetti.map((p, idx) => (
              <motion.div
                key={idx}
                className="absolute"
                style={{ left: `${p.left}%` }}
                initial={{
                  y: "-10%",
                  x: p.drift * -0.5,
                  rotate: 0,
                  opacity: 0,
                }}
                animate={{
                  y: "110%",
                  x: p.drift,
                  rotate: p.rotate,
                  opacity: [0, 1, 1, 0.7, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                }}
              >
                <div
                  style={{
                    width: p.size,
                    height: p.size * 1.6,
                    borderRadius: 4,
                    background:
                      idx % 4 === 0
                        ? "linear-gradient(135deg, hsl(var(--primary)), hsl(45 90% 60%))"
                        : `hsl(${p.hue} 90% 65%)`,
                    boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
