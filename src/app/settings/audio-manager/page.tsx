"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Headphones, Download } from "lucide-react";
import { RECITERS } from "@/lib/reciters";
import { useT } from "@/lib/i18n/I18nProvider";
import { BottomNav } from "@/components/home/BottomNav";

export default function AudioManagerPage() {
  const t = useT();
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(
      RECITERS.map((r) =>
        fetch(`/api/audio/status?reciterId=${r.id}`)
          .then((res) => res.json())
          .then((d) => [r.id, (d.downloaded ?? []).length] as const)
          .catch(() => [r.id, 0] as const)
      )
    ).then((pairs) => {
      if (alive) setCounts(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-2">
          <Link
            href="/settings"
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold">{t("dl.recitations")}</h1>
          <span className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        <p className="px-1 pb-3 text-sm text-muted-foreground">
          {t("dl.recitations_sub")}
        </p>
        <div className="space-y-2.5">
          {RECITERS.map((r) => {
            const count = counts[r.id] ?? 0;
            return (
              <Link
                key={r.id}
                href={`/settings/audio-manager/${r.id}`}
                className="card flex items-center gap-3 p-3.5 transition-colors hover:border-border-strong"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Headphones className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.style}</p>
                </div>
                {count > 0 ? (
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                    {count}/114
                  </span>
                ) : (
                  <Download className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
