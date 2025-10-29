"use client";

import { motion } from "motion/react";
import { SiteHeader } from "@/components/site-header";
import { useLocale } from "@/components/locale-provider";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Calendar, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const articles: Record<
  string,
  {
    title: string;
    titleEn: string;
    date: string;
    content: string;
    contentEn: string;
  }
> = {
  "welcome-to-belachain": {
    title: "欢迎来到 Belachain",
    titleEn: "Welcome to Belachain",
    date: "2024-01-15",
    content: `
# 欢迎来到 Belachain

我们很高兴地宣布 Belachain 正式启动！

## 我们的愿景

Belachain 致力于打造一个公平、透明、高效的去中心化金融生态系统。通过创新的空投机制和等级系统，我们让每个参与者都能从生态系统的成长中获益。

## 核心特性

- **每日交互奖励**：参与每日交互活动，获取 BELA 代币奖励
- **等级系统**：通过累积贡献值提升等级，解锁更高的奖励
- **团队推荐**：邀请好友加入，获得多代推荐奖励
- **即时提现**：USDT 奖励累计达到 10U 即可提现

## 路线图

我们的发展路线图包括：

1. **Q1 2024**：平台启动，空投计划开始
2. **Q2 2024**：引入更多 DeFi 功能
3. **Q3 2024**：跨链桥接功能
4. **Q4 2024**：DAO 治理上线

感谢您的支持，让我们一起建设 Belachain 生态系统！
    `,
    contentEn: `
# Welcome to Belachain

We are excited to announce the official launch of Belachain!

## Our Vision

Belachain is committed to building a fair, transparent, and efficient decentralized finance ecosystem. Through innovative airdrop mechanisms and level systems, we enable every participant to benefit from the ecosystem's growth.

## Core Features

- **Daily Interaction Rewards**: Participate in daily interactions to earn BELA token rewards
- **Level System**: Increase your level by accumulating contribution points to unlock higher rewards
- **Team Referral**: Invite friends to join and earn multi-generation referral rewards
- **Instant Withdrawal**: Withdraw USDT rewards once you accumulate 10U

## Roadmap

Our development roadmap includes:

1. **Q1 2024**: Platform launch, airdrop program begins
2. **Q2 2024**: Introduce more DeFi features
3. **Q3 2024**: Cross-chain bridge functionality
4. **Q4 2024**: DAO governance launch

Thank you for your support. Let's build the Belachain ecosystem together!
    `,
  },
  "airdrop-program-launch": {
    title: "空投计划正式启动",
    titleEn: "Airdrop Program Launch",
    date: "2024-01-20",
    content: `
# 空投计划正式启动

Belachain 空投计划现已正式启动！

## 如何参与

1. 连接您的 Web3 钱包
2. 确保钱包连接到 Arbitrum 网络
3. 前往空投页面，开始每日交互
4. 每次交互需要支付少量 Gas 费（约 0.6-0.8U）

## 奖励机制

- **BELA 代币**：每次交互都会获得 BELA 代币奖励
- **USDT 奖励**：根据您的等级，每次交互可获得 0.1-1.0 USDT
- **BGP 积分**：累积 BGP 积分可提升等级

## 提现规则

- USDT 奖励累计达到 10U 即可提现
- 提现无手续费
- 提现即时到账

立即开始您的 Belachain 之旅！
    `,
    contentEn: `
# Airdrop Program Launch

The Belachain airdrop program is now officially live!

## How to Participate

1. Connect your Web3 wallet
2. Ensure your wallet is connected to the Arbitrum network
3. Go to the airdrop page and start daily interactions
4. Each interaction requires a small gas fee (approximately 0.6-0.8U)

## Reward Mechanism

- **BELA Tokens**: Earn BELA token rewards with each interaction
- **USDT Rewards**: Earn 0.1-1.0 USDT per interaction based on your level
- **BGP Points**: Accumulate BGP points to increase your level

## Withdrawal Rules

- Withdraw USDT rewards once you accumulate 10U
- No withdrawal fees
- Instant withdrawal processing

Start your Belachain journey today!
    `,
  },
  "level-system-update": {
    title: "等级系统更新",
    titleEn: "Level System Update",
    date: "2024-01-25",
    content: `
# 等级系统更新

我们很高兴地宣布等级系统的重大更新！

## 新的等级结构

现在共有 10 个等级，从 V1 到 V10：

- **V1-V3**：入门级别，适合新用户
- **V4-V6**：中级级别，奖励显著提升
- **V7-V9**：高级级别，享受最高奖励
- **V10**：顶级级别，专属特权

## 升级要求

每个等级都有对应的 BGP 贡献值要求：

- V1: 0 BGP（起始等级）
- V2: 100 BGP
- V3: 300 BGP
- V4: 600 BGP
- V5: 1,000 BGP
- V6: 1,500 BGP
- V7: 2,100 BGP
- V8: 2,800 BGP
- V9: 3,600 BGP
- V10: 4,500 BGP

## 奖励提升

随着等级提升，您将获得：

- 更高的 USDT 每日奖励
- 更多的 BGP 积分
- 更高的团队推荐奖励比例

立即查看您的等级，开始升级之旅！
    `,
    contentEn: `
# Level System Update

We are excited to announce a major update to the level system!

## New Level Structure

There are now 10 levels, from V1 to V10:

- **V1-V3**: Entry levels, suitable for new users
- **V4-V6**: Intermediate levels, significantly increased rewards
- **V7-V9**: Advanced levels, enjoy the highest rewards
- **V10**: Top level, exclusive privileges

## Upgrade Requirements

Each level has corresponding BGP contribution value requirements:

- V1: 0 BGP (starting level)
- V2: 100 BGP
- V3: 300 BGP
- V4: 600 BGP
- V5: 1,000 BGP
- V6: 1,500 BGP
- V7: 2,100 BGP
- V8: 2,800 BGP
- V9: 3,600 BGP
- V10: 4,500 BGP

## Reward Increases

As you level up, you will receive:

- Higher daily USDT rewards
- More BGP points
- Higher team referral reward percentages

Check your level now and start your upgrade journey!
    `,
  },
};

export default function AnnouncementDetailPage() {
  const { locale, t } = useLocale();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const slug = params?.slug as string;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  const article = articles[slug];

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
