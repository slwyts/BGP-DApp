"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { translations, type Locale } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const savedLocale = localStorage.getItem("locale") as Locale;
      if (savedLocale && (savedLocale === "en" || savedLocale === "zh")) {
        return savedLocale;
      }
    }
    return "zh";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("locale", locale);
    }
  }, [locale, mounted]);

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: Record<string, unknown> | string = translations[locale];

    for (const k of keys) {
      if (typeof value === "object" && value !== null) {
        value = value[k] as Record<string, unknown> | string;
      }
    }

    return typeof value === "string" ? value : key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
