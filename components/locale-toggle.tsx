"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/components/locale-provider";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-card border-border hover:bg-accent"
        >
          <Languages className="h-5 w-5" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale("en")}>
          English {locale === "en" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("zh")}>
          中文 {locale === "zh" && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
