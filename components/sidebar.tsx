"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Users,
  Gift,
  User,
  X,
  Plane,
  Megaphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();

  const items = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/airdrops", label: t("airdrops"), icon: Plane },
    { href: "/team", label: t("team"), icon: Users },
    { href: "/rewards", label: t("rewards"), icon: Gift },
    { href: "/me", label: t("profile"), icon: User },
    { href: "/announcements", label: t("announcements"), icon: Megaphone },
  ];

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-90 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: 0.2 }}
          />

          <motion.aside
            className="fixed inset-0 z-100 h-full w-full bg-background shadow-2xl p-6 flex flex-col gap-6 pointer-events-auto overflow-y-auto"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="absolute inset-0 opacity-5">
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="hexagons"
                    x="0"
                    y="0"
                    width="50"
                    height="43.4"
                    patternUnits="userSpaceOnUse"
                  >
                    <polygon
                      points="24.8,22 37.3,29.2 37.3,43.7 24.8,50.9 12.3,43.7 12.3,29.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-primary"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexagons)" />
              </svg>
            </div>

            <div className="flex items-center justify-between relative z-10">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span className="text-xl font-bold bg-linear-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                  {t("appName")}
                </span>
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-primary/10 transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="mt-4 flex flex-col gap-2 relative z-10">
              {items.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link href={item.href} onClick={onClose}>
                      <motion.div
                        className={cn(
                          "relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden",
                          isActive
                            ? "bg-linear-to-r from-primary to-orange-500 text-white shadow-lg shadow-primary/30"
                            : "bg-card/50 hover:bg-card/80 text-foreground border border-border/50 hover:border-primary/50",
                        )}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {!isActive && (
                          <motion.div
                            className="absolute inset-0 bg-linear-to-r from-transparent via-primary/10 to-transparent"
                            initial={{ x: "-100%" }}
                            whileHover={{ x: "100%" }}
                            transition={{ duration: 0.6 }}
                          />
                        )}

                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                            isActive
                              ? "bg-white/20"
                              : "bg-linear-to-br from-primary/20 to-orange-500/20 group-hover:from-primary/30 group-hover:to-orange-500/30",
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-base font-semibold relative z-10">
                          {item.label}
                        </span>

                        {isActive && (
                          <motion.div
                            className="absolute right-3 w-2 h-2 rounded-full bg-white"
                            layoutId="activeIndicator"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="bg-card/30 backdrop-blur-md rounded-2xl p-4 border border-primary/20 mb-6 mt-6">
              <div className="grid gap-2">
                <Link href="#" target="_blank" className="underline text-sm">
                  {t("officialSite")}
                </Link>
                <Link href="#" className="underline text-sm">
                  {t("blockExplorer")}
                </Link>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-auto space-y-3 relative z-10"
            >
              <Button
                variant="outline"
                className="w-full bg-linear-to-r from-primary/10 to-orange-500/10 border-primary/30 hover:from-primary/20 hover:to-orange-500/20 transition-all duration-300"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {t("connectWallet")}
              </Button>

              <div className="relative overflow-hidden bg-linear-to-br from-primary/10 via-orange-500/10 to-transparent rounded-2xl p-4 border border-primary/30">
                <div className="relative z-10">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("totalBalance")}
                  </div>
                  <div className="text-2xl font-bold bg-linear-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                    12,345 BLA
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2">
                © {new Date().getFullYear()} Belachain
              </div>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
