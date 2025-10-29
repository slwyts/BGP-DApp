"use client";

import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Calendar, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnnouncementArticle } from "@/lib/announcements";

export function AnnouncementClient({
  article,
}: {
  article: AnnouncementArticle | null;
}) {
  const { locale, t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!article) {
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
        <div className="relative z-10 min-h-screen">
          <div className="px-5 py-4">
            <SiteHeader />
          </div>
          <div className="px-5 pb-10 max-w-4xl mx-auto">
            <div className="text-center py-20">
              <h1 className="text-2xl font-bold mb-4">Article not found</h1>
              <Link
                href="/announcements"
                className="text-primary hover:underline"
              >
                Back to announcements
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
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
          >
            <Link
              href="/announcements"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToAnnouncements")}</span>
            </Link>

            <div className="bg-card/30 backdrop-blur-md rounded-3xl p-8 border border-primary/20">
              <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-primary via-orange-500 to-orange-600 bg-clip-text text-transparent">
                {locale === "zh" ? article.title : article.titleEn}
              </h1>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
                <Calendar className="w-4 h-4" />
                <span>{article.date}</span>
              </div>

              <div className="prose prose-invert max-w-none">
                {(locale === "zh" ? article.content : article.contentEn)
                  .split("\n")
                  .map((line, i) => {
                    if (line.startsWith("# ")) {
                      return (
                        <h1 key={i} className="text-3xl font-bold mt-8 mb-4">
                          {line.substring(2)}
                        </h1>
                      );
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <h2 key={i} className="text-2xl font-bold mt-6 mb-3">
                          {line.substring(3)}
                        </h2>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <li key={i} className="ml-6 mb-2 text-muted-foreground">
                          {line.substring(2)}
                        </li>
                      );
                    }
                    if (line.trim() === "") {
                      return <br key={i} />;
                    }
                    return (
                      <p
                        key={i}
                        className="mb-4 text-muted-foreground leading-relaxed"
                      >
                        {line}
                      </p>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
