"use client";

import { motion } from "motion/react";
import {
  Rocket,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  const features = [
    {
      icon: Rocket,
      title: t("airdropRewardsTitle"),
      description: t("airdropRewardsDesc"),
      color: "from-primary to-orange-500",
    },
    {
      icon: TrendingUp,
      title: t("levelSystemTitle"),
      description: t("levelSystemDesc"),
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Shield,
      title: t("secureReliableTitle"),
      description: t("secureReliableDesc"),
      color: "from-primary to-orange-400",
    },
    {
      icon: Zap,
      title: t("instantTransactionsTitle"),
      description: t("instantTransactionsDesc"),
      color: "from-orange-600 to-primary",
    },
  ];

  return (
    <BackgroundBeamsWithCollision className="min-h-screen">
      <div className="min-h-screen text-foreground overflow-hidden relative">
        <div className="px-5 py-4">
          <SiteHeader />
        </div>

        <div className="relative z-10 w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="max-w-4xl mx-auto text-center space-y-12 py-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <motion.div
                className="absolute -inset-8 bg-linear-to-r from-primary/20 via-orange-500/20 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              />

              <div className="relative">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-primary/20 to-orange-500/20 border border-primary/30 mb-6"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {t("welcomeTo")}
                  </span>
                </motion.div>

                <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-tight">
                  <span className="bg-linear-to-r from-foreground via-primary to-orange-500 bg-clip-text text-transparent">
                    {t("belaChainTitle")}
                  </span>
                  <br />
                  <span className="bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent text-2xl md:text-3xl">
                    {t("aiRwaTagline")}
                  </span>
                </h1>

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "40%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-1.5 bg-linear-to-r from-primary via-orange-500 to-transparent rounded-full mb-6 mx-auto"
                />

                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-8 whitespace-pre-line">
                  {t("landingDescription")}
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <Link href="/airdrops">
                    <Button className="bg-linear-to-r from-primary via-orange-500 to-orange-600 hover:from-primary/90 hover:via-orange-500/90 hover:to-orange-600/90 text-white border-0 px-10 py-7 text-xl font-extrabold shadow-2xl rounded-2xl group">
                      {t("startClaimingAirdrops")}
                      <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="relative group"
                >
                  <div
                    className={`absolute -inset-2 bg-linear-to-br ${feature.color} rounded-3xl opacity-0 group-hover:opacity-20 blur-2xl transition-all duration-300`}
                  />

                  <div className="relative overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-primary/20 p-6 shadow-xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30" />

                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-linear-to-br ${feature.color} flex items-center justify-center shadow-lg`}
                      >
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2 bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Removed bottom CTA per spec */}
          </div>
        </div>
      </div>
    </BackgroundBeamsWithCollision>
  );
}
