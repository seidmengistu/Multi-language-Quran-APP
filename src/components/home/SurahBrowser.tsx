"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Settings,
  Bookmark,
  ChevronRight,
  ArrowRight,
  Trash2,
  BookOpen,
  CornerDownRight,
} from "lucide-react";
import type { SurahIndexEntry } from "@/lib/surahs.server";
import type { JuzInfo } from "@/lib/quran-meta";
import { StarBadge } from "@/components/ui/StarBadge";
import { ThemeToggle } from "@/components/theme/ThemeControls";
import {
  useBookmarks,
  useVerseBookmarks,
  useLastRead,
  useReadingProgress,
  type Bookmark as BookmarkEntry,
  type VerseBookmark,
} from "@/lib/storage";
import { BottomNav } from "./BottomNav";
import { useT } from "@/lib/i18n/I18nProvider";

type Tab = "surah" | "juz" | "bookmark";

/* Strip the leading "سُورَة" word so cards show just the surah name. */
function surahArabic(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    const first = parts[0].replace(/[ً-ْٰـ]/g, "");
    if (first.startsWith("سور")) return parts.slice(1).join(" ");
  }
  return name;
}

/* Normalise Arabic for search (drop diacritics, unify letter forms). */
function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْٰـؐ-ؚ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function ProgressRing({
  percent,
  size = 60,
  stroke = 5,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f3e7c6"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{percent}%</span>
    </span>
  );
}

function RevelationTag({ type }: { type: string }) {
  const t = useT();
  const meccan = type.toLowerCase().startsWith("mecc");
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: meccan ? "var(--gold)" : "var(--primary)" }}
      />
      {meccan ? t("common.meccan") : t("common.medinan")}
    </span>
  );
}

export function SurahBrowser({
  surahs,
  juz,
  initialTab = "surah",
}: {
  surahs: SurahIndexEntry[];
  juz: JuzInfo[];
  initialTab?: Tab;
}) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  // Keep the visible tab in sync with the URL (?tab=…) on soft navigations —
  // e.g. tapping Saved ⇄ Read in the bottom nav, which only changes the query.
  const [prevInitial, setPrevInitial] = useState<Tab>(initialTab);
  if (initialTab !== prevInitial) {
    setPrevInitial(initialTab);
    setTab(initialTab);
  }

  const selectTab = (value: Tab) => {
    setTab(value);
    router.replace(value === "surah" ? "/suras" : `/suras?tab=${value}`, {
      scroll: false,
    });
  };

  const [lastRead, , lastReadHydrated] = useLastRead();
  const { percent } = useReadingProgress();
  const { bookmarks, removeBookmark, hydrated: bmHydrated } = useBookmarks();
  const {
    verses: verseBookmarks,
    toggleVerseBookmark,
    hydrated: vbHydrated,
  } = useVerseBookmarks();

  const surahName = useMemo(() => {
    const m = new Map<number, string>();
    surahs.forEach((s) => m.set(s.id, s.nameEnglish));
    return (id: number) => m.get(id) ?? `Surah ${id}`;
  }, [surahs]);

  const trimmed = query.trim();
  const searching = trimmed.length > 0;
  const pageJump =
    /^\d+$/.test(trimmed) && +trimmed >= 1 && +trimmed <= 604 ? +trimmed : null;

  const filteredSurahs = useMemo(() => {
    if (!searching) return surahs;
    const ql = trimmed.toLowerCase();
    const qa = normalizeAr(trimmed);
    return surahs.filter(
      (s) =>
        String(s.id).includes(trimmed) ||
        s.nameEnglish.toLowerCase().includes(ql) ||
        s.nameTranslation.toLowerCase().includes(ql) ||
        normalizeAr(s.nameArabic).includes(qa)
    );
  }, [surahs, searching, trimmed]);

  return (
    <div className="min-h-screen">
      {/* ── App header ─────────────────────────────────────── */}
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <span className="flex h-9 w-9 items-center justify-center">
            <StarBadge n="" size={36} />
          </span>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight">
              Quran App
            </h1>
            <p className="text-[11px] leading-tight text-white/70">
              {t("browse.subtitle")}
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

      <div className="mx-auto max-w-2xl px-4 pb-24">
        {/* ── Bismillah band ──────────────────────────────── */}
        <div className="flex items-center gap-4 py-5">
          <span className="gold-rule flex-1" />
          <span className="font-arabic text-xl text-gold">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </span>
          <span className="gold-rule flex-1" />
        </div>

        {/* ── Continue reading hero ───────────────────────── */}
        {!lastReadHydrated ? (
          <div className="h-[104px] animate-pulse rounded-2xl bg-muted" />
        ) : lastRead ? (
          <Link
            href={`/mushaf/${lastRead.page}`}
            className="app-bar group flex items-center gap-4 rounded-2xl p-4 shadow-lg ring-1 ring-black/5 transition-transform active:scale-[0.99]"
          >
            <ProgressRing percent={percent} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                {t("dash.continue_reading")}
              </p>
              <p className="truncate text-lg font-bold">
                {lastRead.surahName}
              </p>
              <p className="text-sm text-white/80">
                {t("common.page")} {lastRead.page} · {percent}%
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <Link
            href="/mushaf/1"
            className="app-bar group flex items-center gap-4 rounded-2xl p-5 shadow-lg ring-1 ring-black/5 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <BookOpen className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{t("dash.begin_reading")}</p>
              <p className="text-sm text-white/80">{t("dash.begin_sub")}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        )}

        {/* ── Search ──────────────────────────────────────── */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="search"
            placeholder={t("browse.search")}
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* ── Tabs (hidden while searching) ───────────────── */}
        {!searching && (
          <div className="segmented mt-4">
            {(
              [
                ["surah", "tab.surah"],
                ["juz", "tab.juz"],
                ["bookmark", "tab.bookmark"],
              ] as const
            ).map(([value, labelKey]) => (
              <button
                key={value}
                data-active={tab === value}
                onClick={() => selectTab(value)}
                className="segmented-item"
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        )}

        {/* ── List area ───────────────────────────────────── */}
        <div className="mt-4 space-y-2.5">
          {searching ? (
            <SearchResults
              pageJump={pageJump}
              surahs={filteredSurahs}
              query={trimmed}
            />
          ) : tab === "surah" ? (
            surahs.map((s) => <SurahRow key={s.id} s={s} />)
          ) : tab === "juz" ? (
            juz.map((j) => (
              <JuzRow key={j.juz} j={j} surahName={surahName(j.startSurahId)} />
            ))
          ) : (
            <BookmarksTab
              bookmarks={bookmarks}
              verses={verseBookmarks}
              removeBookmark={removeBookmark}
              removeVerse={toggleVerseBookmark}
              hydrated={bmHydrated && vbHydrated}
            />
          )}
        </div>
      </div>
      <BottomNav active={tab === "bookmark" ? "saved" : "read"} />
    </div>
  );
}

function SurahRow({ s }: { s: SurahIndexEntry }) {
  const t = useT();
  return (
    <Link
      href={`/read/${s.id}`}
      className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
    >
      <StarBadge n={s.id} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{s.nameEnglish}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <RevelationTag type={s.revelationType} />
          <span aria-hidden>·</span>
          <span>{t("common.verses", { n: s.ayahCount })}</span>
        </p>
      </div>
      <span className="font-arabic text-2xl leading-none text-foreground">
        {surahArabic(s.nameArabic)}
      </span>
    </Link>
  );
}

function JuzRow({ j, surahName }: { j: JuzInfo; surahName: string }) {
  const t = useT();
  return (
    <Link
      href={`/mushaf/${j.page}`}
      className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
    >
      <StarBadge n={j.juz} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{t("browse.juz", { n: j.juz })}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t("browse.juz_starts", {
            name: surahName,
            ref: `${j.startSurahId}:${j.startAyah}`,
          })}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {t("common.page")} {j.page}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function SearchResults({
  pageJump,
  surahs,
  query,
}: {
  pageJump: number | null;
  surahs: SurahIndexEntry[];
  query: string;
}) {
  const t = useT();
  return (
    <>
      {pageJump && (
        <Link
          href={`/mushaf/${pageJump}`}
          className="card flex items-center gap-3 border-primary/30 bg-primary-soft p-3.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CornerDownRight className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {t("browse.go_to_page", { n: pageJump })}
            </p>
            <p className="text-xs text-muted-foreground">{t("browse.open_mushaf")}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary" />
        </Link>
      )}
      {surahs.length > 0 ? (
        surahs.map((s) => <SurahRow key={s.id} s={s} />)
      ) : pageJump ? null : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("browse.no_surah", { q: query })}
        </p>
      )}
    </>
  );
}

function EmptyBookmarks() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Bookmark className="h-6 w-6 text-muted-foreground" />
      </span>
      <p className="font-semibold text-foreground">{t("browse.no_bookmarks")}</p>
      <p className="max-w-[16rem] text-sm text-muted-foreground">
        {t("browse.no_bookmarks_hint")}
      </p>
    </div>
  );
}

function BookmarkGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground first:pt-0">
      {children}
    </p>
  );
}

/* The Saved tab: page bookmarks (from the Mushaf) and verse bookmarks (from the
   Reading view) shown together, each linking back to where it was saved. */
function BookmarksTab({
  bookmarks,
  verses,
  removeBookmark,
  removeVerse,
  hydrated,
}: {
  bookmarks: BookmarkEntry[];
  verses: VerseBookmark[];
  removeBookmark: (page: number) => void;
  removeVerse: (entry: VerseBookmark) => void;
  hydrated: boolean;
}) {
  const t = useT();
  if (!hydrated) {
    return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  }
  if (bookmarks.length === 0 && verses.length === 0) {
    return <EmptyBookmarks />;
  }
  const showLabels = bookmarks.length > 0 && verses.length > 0;
  return (
    <>
      {bookmarks.length > 0 && (
        <>
          {showLabels && (
            <BookmarkGroupLabel>{t("browse.saved_pages")}</BookmarkGroupLabel>
          )}
          {bookmarks.map((b) => (
            <div
              key={`p-${b.page}`}
              className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
            >
              <Link
                href={`/mushaf/${b.page}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <StarBadge n={b.surahId} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{b.surahName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("common.page")} {b.page}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => removeBookmark(b.page)}
                aria-label="Remove bookmark"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </>
      )}

      {verses.length > 0 && (
        <>
          {showLabels && (
            <BookmarkGroupLabel>{t("browse.saved_verses")}</BookmarkGroupLabel>
          )}
          {verses.map((v) => (
            <div
              key={v.verseKey}
              className="card flex items-center gap-3 p-3 transition-colors hover:border-border-strong"
            >
              <Link
                href={`/read/${v.surahId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <StarBadge n={v.surahId} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{v.surahName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("browse.ayah_n", { n: v.ayah })}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => removeVerse(v)}
                aria-label="Remove bookmark"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}
