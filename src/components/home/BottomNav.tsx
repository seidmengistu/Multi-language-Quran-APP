"use client";

import Link from "next/link";
import { Home, BookOpen, Bookmark, Settings } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

const ITEMS = [
  { key: "home", href: "/", Icon: Home },
  { key: "read", href: "/suras", Icon: BookOpen },
  { key: "saved", href: "/suras?tab=bookmark", Icon: Bookmark },
  { key: "settings", href: "/settings", Icon: Settings },
] as const;

export function BottomNav({ active }: { active: string }) {
  const t = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {ITEMS.map(({ key, href, Icon }) => {
          const label = t(`nav.${key}`);
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className="h-5 w-5"
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={isActive ? 1.5 : 2}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
