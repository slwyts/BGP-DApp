"use client";

import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Zap, Gift, Star, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocale } from "@/components/locale-provider";

interface DailyRewardAnimationProps {
  open: boolean;
  onClose: () => void;
  amount?: number; // BGP 奖励数量
}

export function DailyRewardAnimation({
  open,
  onClose,
  amount = 1000, // 默认 1000 BGP
}: DailyRewardAnimationProps) {
  const { t } = useLocale();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [particles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      delay: Math.random() * 0.5,
    })),
  );

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-100 pointer-events-none flex items-center justify-center"
          style={{ isolation: "isolate" }}
        >
          {/* Background overlay - clickable */}
          <motion.div
            className="absolute inset-0 pointer-events-auto"
            style={{
              background: isMobile
                ? "rgba(0, 0, 0, 0.9)"
                : "radial-gradient(circle at 50% 50%, rgba(255, 140, 50, 0.3) 0%, rgba(0,0,0,0.85) 60%)",
              backdropFilter: isMobile ? "none" : "blur(4px)",
              WebkitBackdropFilter: isMobile ? "none" : "blur(4px)",
            }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          {/* Radial gradient background */}
          {!isMobile && (
            <div className="absolute inset-0">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,140,50,0.3), rgba(255,100,30,0.2), transparent)",
                  willChange: "transform, opacity",
                }}
              />

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-4 border-primary/30"
                style={{ willChange: "transform, opacity" }}
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.2 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-4 border-orange-500/20"
                style={{ willChange: "transform, opacity" }}
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.2 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-4 border-orange-600/20"
                style={{ willChange: "transform, opacity" }}
              />
            </div>
          )}

          {/* Floating particles - reduced on mobile */}
          {!isMobile && (
            <div className="absolute inset-0 flex items-center justify-center">
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: particle.x * 8,
                    y: particle.y * 8,
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: particle.delay,
                    ease: "easeOut",
                  }}
                  className="absolute"
                  style={{ willChange: "transform, opacity" }}
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Central content */}
          <motion.div
            initial={{ scale: 0, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: -50, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative z-10 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ willChange: "transform, opacity" }}
          >
            <motion.div
              animate={
                isMobile
                  ? {}
                  : {
                      scale: [1, 1.1, 1],
                    }
              }
              transition={
                isMobile
                  ? {}
                  : {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className="relative mx-auto w-48 h-48 mb-8"
            >
              <div
                className="absolute inset-0 bg-linear-to-br from-primary via-orange-500 to-orange-600 rounded-full blur-3xl opacity-60"
                style={{ willChange: "auto" }}
              />
              <div className="absolute inset-4 bg-linear-to-br from-primary via-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl">
                <Gift className="w-24 h-24 text-white" />
              </div>

              {!isMobile &&
                [0, 120, 240].map((angle, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: [angle, angle + 180],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0"
                    style={{ willChange: "transform" }}
                  >
                    <motion.div
                      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.3,
                      }}
                      style={{ willChange: "transform" }}
                    >
                      {i === 0 && (
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                      )}
                      {i === 1 && <Coins className="w-8 h-8 text-orange-400" />}
                      {i === 2 && (
                        <Zap className="w-8 h-8 text-primary fill-primary" />
                      )}
                    </motion.div>
                  </motion.div>
                ))}
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <motion.h2
                animate={
                  isMobile
                    ? {}
                    : {
                        scale: [1, 1.05, 1],
                      }
                }
                transition={
                  isMobile
                    ? {}
                    : {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
                className="text-6xl font-bold mb-4 bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent"
              >
                {t("dailyReward")}
              </motion.h2>
              <p className="text-2xl text-muted-foreground mb-2">
                {t("interactionSuccessful")}
              </p>
              <motion.p
                animate={
                  isMobile
                    ? {}
                    : {
                        opacity: [0.6, 1, 0.6],
                      }
                }
                transition={
                  isMobile
                    ? {}
                    : {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
                className="text-4xl font-bold text-primary"
              >
                +{amount.toLocaleString()} BGP
              </motion.p>
            </motion.div>

            {/* Pulse waves - desktop only */}
            {!isMobile &&
              [0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{
                    scale: [0, 3],
                    opacity: [0.8, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.4,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute inset-0 border-4 border-primary rounded-full"
                  style={{ willChange: "transform, opacity" }}
                />
              ))}
          </motion.div>

          {/* Corner sparkles - desktop only */}
          {!isMobile && (
            <div className="absolute inset-0">
              {[
                { top: "10%", left: "10%" },
                { top: "10%", right: "10%" },
                { bottom: "10%", left: "10%" },
                { bottom: "10%", right: "10%" },
              ].map((pos, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.3 + i * 0.1,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="absolute"
                  style={{ ...pos, willChange: "transform" }}
                >
                  <Sparkles className="w-12 h-12 text-orange-500" />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
