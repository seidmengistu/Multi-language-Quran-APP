"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  BookOpen,
  Languages,
  Play,
  Pause,
  Square,
  Bookmark,
  BookmarkCheck,
  Check,
  X,
} from "lucide-react";
import { fetchChapterAudio, type TimingSegment } from "@/lib/audio-api";
import { DEFAULT_RECITER } from "@/lib/reciters";
import { useAudioSync } from "@/components/mushaf/useAudioSync";
import { useVerseBookmarks, useLastPlayed, useSettings } from "@/lib/storage";
import { TRANSLATIONS, type TranslationOption } from "@/lib/translations";
import { useT } from "@/lib/i18n/I18nProvider";
import type { VerseRow } from "@/lib/verses.server";
import { StarBadge } from "@/components/ui/StarBadge";

/** Standalone Qur'anic pause/waqf marks — the CDN word timings don't count
 *  these as words, so we skip them when numbering words for highlighting. */
const WAQF_ONLY = /^[ۖ-ۭ]+$/;

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Split a verse into tokens, numbering real words 1-based (waqf marks get
 *  null so the numbering aligns with the CDN's word timings). */
function numberWords(text: string): { tok: string; pos: number | null }[] {
  const out: { tok: string; pos: number | null }[] = [];
  let pos = 0;
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    if (WAQF_ONLY.test(tok)) {
      out.push({ tok, pos: null });
    } else {
      pos += 1;
      out.push({ tok, pos });
    }
  }
  return out;
}

/** Renders a verse's Arabic. When it's the playing verse, words are split so the
 *  active word can be highlighted; otherwise it's plain text (cheaper). */
function VerseArabic({
  text,
  activeWordPos,
  fontSize,
}: {
  text: string;
  activeWordPos: number | null;
  fontSize: number;
}) {
  const style = { fontSize: `${fontSize}rem`, lineHeight: 2 } as const;
  if (activeWordPos == null) {
    return (
      <p dir="rtl" className="font-arabic text-foreground" style={style}>
        {text}
      </p>
    );
  }
  const items = numberWords(text);
  return (
    <p dir="rtl" className="font-arabic text-foreground" style={style}>
      {items.map((it, i) => {
        const isActive = it.pos != null && it.pos === activeWordPos;
        return (
          <span key={i} className={isActive ? "reading-word-active" : undefined}>
            {it.tok}
            {i < items.length - 1 ? " " : ""}
          </span>
        );
      })}
    </p>
  );
}

interface Props {
  surahId: number;
  surahName: string;
  surahTranslation: string;
  surahArabic: string;
  revelation: string;
  ayahCount: number;
  startPage: number;
  verses: VerseRow[];
  translation: TranslationOption;
}

export function ReadingView({
  surahId,
  surahName,
  surahTranslation,
  surahArabic,
  revelation,
  ayahCount,
  startPage,
  verses,
  translation,
}: Props) {
  const tx = useT();
  const { settings } = useSettings();
  const { isVerseBookmarked, toggleVerseBookmark } = useVerseBookmarks();
  const [, setLastPlayed] = useLastPlayed();

  const [audioUrl, setAudioUrl] = useState("");
  const [segments, setSegments] = useState<TimingSegment[]>([]);
  const [audioError, setAudioError] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetchChapterAudio(DEFAULT_RECITER.id, surahId)
      .then((d) => {
        if (!alive) return;
        setAudioUrl(d.audioUrl);
        setSegments(d.segments);
      })
      .catch(() => alive && setAudioError(true));
    return () => {
      alive = false;
    };
  }, [surahId]);

  const {
    audioRef,
    activeWord,
    isPlaying,
    toggle,
    stop,
    play,
    seek,
    seekToSeconds,
    currentTime,
    duration,
    progress,
  } = useAudioSync(segments);
  const activeVerseKey = activeWord?.verseKey ?? null;

  const verseStartMs = useCallback(
    (vk: string) => {
      let min: number | null = null;
      for (const s of segments) {
        if (s.verseKey === vk && (min == null || s.startMs < min)) min = s.startMs;
      }
      return min;
    },
    [segments]
  );

  const playVerse = useCallback(
    (vk: string) => {
      const ms = verseStartMs(vk);
      if (ms == null) {
        setAudioError(true);
        return;
      }
      seekToSeconds(ms / 1000);
      play();
      setLastPlayed({
        reciterId: DEFAULT_RECITER.id,
        reciterName: DEFAULT_RECITER.name,
        surahId,
        surahName,
        page: startPage,
        verseKey: vk,
        updatedAt: Date.now(),
      });
    },
    [verseStartMs, seekToSeconds, play, surahId, surahName, startPage, setLastPlayed]
  );

  // Auto-scroll to the active verse while playing.
  useEffect(() => {
    if (!activeVerseKey || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-verse="${activeVerseKey}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeVerseKey]);

  const chooseTranslation = async (id: number) => {
    await fetch("/api/translation/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ translationId: id }),
    });
    window.location.reload();
  };

  const meccan = revelation.toLowerCase().startsWith("mecc");
  const showBismillah = surahId !== 1 && surahId !== 9;
  // Larger default (≈120%) for comfortable verse-by-verse reading.
  const arabicSize = 2.2 * settings.arabicFontScale;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-1 px-2">
          <Link
            href="/suras"
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1 text-center">
            <p className="text-base font-bold leading-tight">{surahName}</p>
            <p className="font-arabic text-sm leading-tight text-white/80">
              {surahArabic}
            </p>
          </div>
          <button
            onClick={() => setShowLang(true)}
            aria-label="Translation language"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <Languages className="h-5 w-5" />
          </button>
          <Link
            href={`/mushaf/${startPage}`}
            aria-label="Mushaf view"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <BookOpen className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div ref={containerRef} className="mx-auto max-w-2xl px-4">
        {/* Surah info */}
        <div className="card my-4 p-4 text-center">
          <p className="font-arabic text-3xl text-foreground">{surahArabic}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {surahTranslation} · {meccan ? "Meccan" : "Medinan"} · {ayahCount} verses
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <Languages className="h-3.5 w-3.5" />
            {translation.language} — {translation.name}
          </div>
        </div>

        {showBismillah && (
          <p className="font-arabic py-2 text-center text-2xl text-gold">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>
        )}

        {audioError && (
          <div className="mb-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            Recitation for this surah isn&apos;t downloaded yet — open{" "}
            <Link href="/settings/audio-manager" className="font-semibold text-primary">
              Audio Manager
            </Link>{" "}
            to download it for offline listening.
          </div>
        )}

        {/* Verses */}
        <div className="space-y-3">
          {verses.map((v) => {
            const active = activeVerseKey === v.verseKey;
            const bookmarked = isVerseBookmarked(v.verseKey);
            return (
              <div
                key={v.verseKey}
                data-verse={v.verseKey}
                className={`card overflow-hidden p-4 transition-colors ${
                  active ? "border-primary/50 bg-primary-soft" : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <StarBadge n={v.ayah} size={34} />
                  <span className="text-xs text-muted-foreground">
                    {surahId}:{v.ayah}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => (active && isPlaying ? toggle() : playVerse(v.verseKey))}
                      aria-label="Play verse"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {active && isPlaying ? (
                        <Pause className="h-4 w-4" fill="currentColor" />
                      ) : (
                        <Play className="h-4 w-4" fill="currentColor" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        toggleVerseBookmark({
                          verseKey: v.verseKey,
                          surahId,
                          surahName,
                          ayah: v.ayah,
                          createdAt: Date.now(),
                        })
                      }
                      aria-label={bookmarked ? "Remove bookmark" : "Bookmark verse"}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-primary/10 ${
                        bookmarked ? "text-gold" : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {bookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <VerseArabic
                  text={v.arabic}
                  fontSize={arabicSize}
                  activeWordPos={active ? activeWord?.wordPosition ?? null : null}
                />

                {v.translation && (
                  <p
                    dir={translation.dir}
                    className={`mt-3 text-[15px] leading-relaxed text-muted-foreground ${
                      translation.id === 57 ? "italic" : ""
                    }`}
                  >
                    {v.translation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Now-playing bar */}
      {activeVerseKey && (
        <div className="fixed inset-x-0 bottom-0 z-30 app-bar pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_16px_rgba(0,0,0,0.16)]">
          <div className="mx-auto max-w-2xl px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {tx("read.playing", { name: surahName, ayah: activeVerseKey.split(":")[1] })}
              </span>
              <button
                onClick={toggle}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </button>
              <button
                onClick={stop}
                aria-label="Stop"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15"
              >
                <Square className="h-5 w-5" fill="currentColor" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="w-9 text-right text-[11px] tabular-nums text-white/75">
                {fmtTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 10)}
                onChange={(e) => seek(Number(e.target.value) / 1000)}
                aria-label="Seek"
                className="reading-scrubber flex-1"
                style={{
                  background: `linear-gradient(to right, #f3e7c6 ${progress}%, rgba(255,255,255,0.28) ${progress}%)`,
                }}
              />
              <span className="w-9 text-[11px] tabular-nums text-white/75">
                {fmtTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Language picker sheet */}
      {showLang && (
        <div className="reciter-overlay" onClick={() => setShowLang(false)}>
          <div className="reciter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reciter-modal-header">
              <h2>{tx("read.translation_language")}</h2>
              <button onClick={() => setShowLang(false)} className="reciter-close-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="reciter-list">
              {TRANSLATIONS.map((t) => {
                const isActive = t.id === translation.id;
                return (
                  <button
                    key={t.id}
                    disabled={!t.available}
                    className={`reciter-item ${isActive ? "reciter-item-active" : ""} ${
                      !t.available ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    onClick={() => t.available && chooseTranslation(t.id)}
                  >
                    <div className="reciter-item-info">
                      <span className="reciter-item-name">
                        {t.language}
                        {!t.available && ` · ${tx("read.coming_soon")}`}
                      </span>
                      <span className="reciter-item-arabic">
                        {t.nativeLabel} — {t.name}
                      </span>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="auto"
        onError={() => setAudioError(true)}
      />
    </div>
  );
}
