"use client";

import { useCallback, useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────
   Tiny SSR-safe localStorage layer.

   All persisted state lives under the `tartil:` namespace. Hooks return a
   `hydrated` flag so components can avoid hydration mismatches: render the
   neutral/server value until `hydrated` is true, then swap in stored data.
   A custom window event keeps multiple hooks for the same key in sync
   within a single tab (the native `storage` event only fires across tabs).
   ────────────────────────────────────────────────────────────────────── */

const PREFIX = "tartil:";
const SYNC_EVENT = "tartil:storage";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount (client only).
  useEffect(() => {
    setValue(read(key, initial));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Stay in sync with other hooks / other tabs.
  useEffect(() => {
    const refresh = () => setValue(read(key, initial));
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail?.key === key) refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) refresh();
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  return [value, set, hydrated];
}

/* ─── Reader / appearance settings ─── */
export interface AppSettings {
  arabicFontScale: number; // 0.8 – 1.6
  tajweed: boolean; // force tajweed colouring on any mushaf
  highlightWhilePlaying: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  arabicFontScale: 1,
  tajweed: false,
  highlightWhilePlaying: true,
};

export function useSettings() {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    "settings",
    DEFAULT_SETTINGS
  );
  const update = useCallback(
    (patch: Partial<AppSettings>) => setSettings((p) => ({ ...p, ...patch })),
    [setSettings]
  );
  return { settings, update, hydrated };
}

/* ─── Last read position ─── */
export interface LastRead {
  page: number;
  surahId: number;
  surahName: string;
  updatedAt: number;
}

export function useLastRead() {
  return useLocalStorage<LastRead | null>("lastRead", null);
}

/* ─── Bookmarks ─── */
export interface Bookmark {
  page: number;
  surahId: number;
  surahName: string;
  createdAt: number;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks, hydrated] = useLocalStorage<Bookmark[]>(
    "bookmarks",
    []
  );

  const isBookmarked = useCallback(
    (page: number) => bookmarks.some((b) => b.page === page),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (entry: Bookmark) => {
      setBookmarks((prev) =>
        prev.some((b) => b.page === entry.page)
          ? prev.filter((b) => b.page !== entry.page)
          : [...prev, entry].sort((a, b) => a.page - b.page)
      );
    },
    [setBookmarks]
  );

  const removeBookmark = useCallback(
    (page: number) =>
      setBookmarks((prev) => prev.filter((b) => b.page !== page)),
    [setBookmarks]
  );

  return { bookmarks, isBookmarked, toggleBookmark, removeBookmark, hydrated };
}

/* ─── Last played recitation ─── */
export interface LastPlayed {
  reciterId: number;
  reciterName: string;
  surahId: number;
  surahName: string;
  page: number;
  verseKey: string;
  updatedAt: number;
}

export function useLastPlayed() {
  return useLocalStorage<LastPlayed | null>("lastPlayed", null);
}

/* ─── Verse bookmarks / favorites (from the Reading view) ─── */
export interface VerseBookmark {
  verseKey: string;
  surahId: number;
  surahName: string;
  ayah: number;
  createdAt: number;
}

export function useVerseBookmarks() {
  const [verses, setVerses, hydrated] = useLocalStorage<VerseBookmark[]>(
    "verseBookmarks",
    []
  );

  const isVerseBookmarked = useCallback(
    (verseKey: string) => verses.some((v) => v.verseKey === verseKey),
    [verses]
  );

  const toggleVerseBookmark = useCallback(
    (entry: VerseBookmark) => {
      setVerses((prev) =>
        prev.some((v) => v.verseKey === entry.verseKey)
          ? prev.filter((v) => v.verseKey !== entry.verseKey)
          : [...prev, entry]
      );
    },
    [setVerses]
  );

  return { verses, isVerseBookmarked, toggleVerseBookmark, hydrated };
}

/* ─── Reading progress (set of visited pages / 604) ─── */
export const TOTAL_PAGES = 604;

export function useReadingProgress() {
  const [pages, setPages, hydrated] = useLocalStorage<number[]>("progress", []);

  const markVisited = useCallback(
    (page: number) => {
      setPages((prev) => (prev.includes(page) ? prev : [...prev, page]));
    },
    [setPages]
  );

  const percent = Math.min(
    100,
    Math.round((pages.length / TOTAL_PAGES) * 100)
  );

  return { visitedCount: pages.length, percent, markVisited, hydrated };
}
