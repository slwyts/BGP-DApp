import type React from "react";
import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { Web3Provider } from "@/components/web3-provider";
import { ReferralHandler } from "@/components/referral-handler";

import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const geist = Geist({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sourceSerif_4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Belachain - Decentralized Finance",
  description: "Modern blockchain dapp",
  icons: {
    icon: "/BelachainLogo.jpg",
    apple: "/BelachainLogo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <Web3Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <LocaleProvider>
              <ReferralHandler />
              {children}
            </LocaleProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
