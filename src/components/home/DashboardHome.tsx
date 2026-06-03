"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  BookOpen,
  Headphones,
  Bookmark,
  ArrowRight,
  Play,
  MoonStar,
  ChevronRight,
  BookText,
} from "lucide-react";
import { StarBadge } from "@/components/ui/StarBadge";
import { ThemeToggle } from "@/components/theme/ThemeControls";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { BottomNav } from "./BottomNav";
import { useT } from "@/lib/i18n/I18nProvider";
import {
  useLastRead,
  useReadingProgress,
  useLastPlayed,
  useBookmarks,
  useVerseBookmarks,
} from "@/lib/storage";

interface DailyAyah {
  verseKey: string;
  ayah: number;
  arabic: string;
  translation: string;
  surahId: number;
  surahName: string;
}

function ProgressRing({
  percent,
  size = 56,
  stroke = 5,
  track = "rgba(255,255,255,0.25)",
  color = "#f3e7c6",
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  track?: string;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - percent / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold">{label ?? `${percent}%`}</span>
    </span>
  );
}

const TILES = [
  { href: "/suras", labelKey: "tile.read_quran", Icon: BookOpen },
  { href: "/settings/audio-manager", labelKey: "tile.recitations", Icon: Headphones },
  { href: "/suras?tab=bookmark", labelKey: "tile.bookmarks", Icon: Bookmark },
  { href: "/settings", labelKey: "tile.settings", Icon: Settings },
];

export function DashboardHome({ daily }: { daily: DailyAyah | null }) {
  const t = useT();
  const router = useRouter();
  const [lastRead, , lrHydrated] = useLastRead();
  const { percent, visitedCount } = useReadingProgress();
  const [lastPlayed, , lpHydrated] = useLastPlayed();
  const { bookmarks } = useBookmarks();
  const { verses: verseBookmarks } = useVerseBookmarks();

  const hour = new Date().getHours();
  const greeting = t(
    hour < 12 ? "greeting.morning" : hour < 18 ? "greeting.afternoon" : "greeting.evening"
  );

  const resumeAudio = () => {
    if (!lastPlayed) return;
    sessionStorage.setItem("qa:autoplay", "1");
    router.push(`/mushaf/${lastPlayed.page}`);
  };

  const totalSaved = bookmarks.length + verseBookmarks.length;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <span className="flex h-9 w-9 items-center justify-center">
            <StarBadge n="" size={36} />
          </span>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight">Quran App</h1>
            <p className="text-[11px] leading-tight text-white/70">
              السلام عليكم · {greeting}
            </p>
          </div>
          <ThemeToggle className="text-white" />
          <Link
            href="/settings"
            aria-label="Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-5">
        <InstallBanner />

        {/* Continue Reading */}
        {lrHydrated && lastRead ? (
          <Link
            href={`/mushaf/${lastRead.page}`}
            className="app-bar group flex items-center gap-4 rounded-2xl p-4 shadow-lg ring-1 ring-black/5 transition-transform active:scale-[0.99]"
          >
            <ProgressRing percent={percent} size={60} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {t("dash.continue_reading")}
              </p>
              <p className="truncate text-lg font-bold">{lastRead.surahName}</p>
              <p className="text-sm text-white/80">
                {t("dash.page_complete", { page: lastRead.page, percent })}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <Link
            href="/mushaf/1"
            className="app-bar group flex items-center gap-4 rounded-2xl p-5 shadow-lg ring-1 ring-black/5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <BookOpen className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{t("dash.begin_reading")}</p>
              <p className="text-sm text-white/80">{t("dash.begin_sub")}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        )}

        {/* Last played */}
        {lpHydrated && lastPlayed && (
          <button
            onClick={resumeAudio}
            className="card flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:border-border-strong"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Play className="h-5 w-5" fill="currentColor" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("dash.last_played")}
              </p>
              <p className="truncate font-semibold text-foreground">
                {lastPlayed.surahName} {lastPlayed.verseKey.split(":")[1]}
              </p>
              <p className="truncate text-xs text-muted-foreground">{lastPlayed.reciterName}</p>
            </div>
            <span className="text-xs font-semibold text-primary">{t("common.resume")}</span>
          </button>
        )}

        {/* Daily Ayah */}
        {daily && (
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <MoonStar className="h-4 w-4 text-gold" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("dash.ayah_of_day")}
              </span>
            </div>
            <Link href={`/read/${daily.surahId}`} className="block px-4 py-4">
              <p
                dir="rtl"
                className="font-arabic text-foreground"
                style={{ fontSize: "1.7rem", lineHeight: 2 }}
              >
                {daily.arabic}
              </p>
              {daily.translation && (
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {daily.translation}
                </p>
              )}
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {daily.surahName} · {daily.verseKey}
                <ChevronRight className="h-4 w-4" />
              </p>
            </Link>
          </section>
        )}

        {/* Reading progress */}
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {t("dash.reading_progress")}
            </p>
            <span className="text-xs text-muted-foreground">
              {t("dash.pages_count", { count: visitedCount })}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("dash.progress_note", { percent })}
          </p>
        </section>

        {/* Quick access */}
        <section>
          <h2 className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("dash.quick_access")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TILES.map(({ href, labelKey, Icon }) => (
              <Link
                key={labelKey}
                href={href}
                className="card flex items-center gap-3 p-4 transition-colors hover:border-border-strong"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Bookmarks preview */}
        <section>
          <div className="flex items-center justify-between px-1 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("dash.bookmarks")}
            </h2>
            {totalSaved > 0 && (
              <Link href="/suras?tab=bookmark" className="text-xs font-semibold text-primary">
                {t("dash.view_all", { count: totalSaved })}
              </Link>
            )}
          </div>
          {bookmarks.length === 0 && verseBookmarks.length === 0 ? (
            <div className="card flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <Bookmark className="h-5 w-5 shrink-0" />
              {t("dash.bookmarks_empty")}
            </div>
          ) : (
            <div className="space-y-2.5">
              {bookmarks.slice(0, 3).map((b) => (
                <Link
                  key={`p-${b.page}`}
                  href={`/mushaf/${b.page}`}
                  className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
                >
                  <StarBadge n={b.surahId} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{b.surahName}</p>
                    <p className="text-xs text-muted-foreground">Page {b.page}</p>
                  </div>
                  <BookText className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
              {verseBookmarks.slice(0, 2).map((v) => (
                <Link
                  key={`v-${v.verseKey}`}
                  href={`/read/${v.surahId}`}
                  className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
                >
                  <StarBadge n={v.ayah} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{v.surahName}</p>
                    <p className="text-xs text-muted-foreground">Verse {v.verseKey}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
