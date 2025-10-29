"use client";

import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Megaphone, Calendar, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

const announcements = [
  {
    id: "welcome-to-belachain",
    title: "欢迎来到 Belachain",
    titleEn: "Welcome to Belachain",
    date: "2024-01-15",
    excerpt: "Belachain 正式启动！了解我们的愿景和路线图。",
    excerptEn:
      "Belachain officially launches! Learn about our vision and roadmap.",
  },
  {
    id: "airdrop-program-launch",
    title: "空投计划正式启动",
    titleEn: "Airdrop Program Launch",
    date: "2024-01-20",
    excerpt: "参与每日交互，赢取 BELA 代币和 USDT 奖励。",
    excerptEn:
      "Participate in daily interactions to earn BELA tokens and USDT rewards.",
  },
  {
    id: "level-system-update",
    title: "等级系统更新",
    titleEn: "Level System Update",
    date: "2024-01-25",
    excerpt: "新的等级系统上线，更多奖励等你来拿！",
    excerptEn: "New level system is live with more rewards!",
  },
];

export default function AnnouncementsPage() {
  const { t, locale } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen">
      <DotPattern
        className="absolute inset-0 z-0"
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
      />
      <div className="absolute inset-0 bg-linear-to-b from-orange-500/5 via-transparent to-primary/5 z-0" />

      <div className="relative z-10 min-h-screen">
        <div className="px-5 py-4">
          <SiteHeader />
        </div>

        <div className="px-5 pb-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary via-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
                {t("announcementsPageTitle")}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {t("announcementsPageDesc")}
            </p>
          </motion.div>

          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/announcements/${announcement.id}`}>
                  <div className="group bg-card/30 backdrop-blur-md rounded-2xl p-6 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {locale === "zh"
                            ? announcement.title
                            : announcement.titleEn}
                        </h2>
                        <p className="text-muted-foreground mb-3 leading-relaxed">
                          {locale === "zh"
                            ? announcement.excerpt
                            : announcement.excerptEn}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{announcement.date}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
