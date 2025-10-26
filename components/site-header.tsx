"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { useLocale } from "@/components/locale-provider";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import Image from "next/image";

export function SiteHeader() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-50 w-full flex items-center justify-between px-0 py-0"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/BelachainLogo.jpg"
          alt="Belachain Logo"
          width={40}
          height={40}
          className="rounded-lg"
        />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LocaleToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
      <Sidebar open={open} onClose={() => setOpen(false)} />
    </motion.header>
  );
}
