"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import {
  PageWord,
  groupWordsByLine,
} from "@/lib/quran-page-api";
import { TimingSegment, fetchChapterAudio } from "@/lib/audio-api";
import { DEFAULT_RECITER, Reciter } from "@/lib/reciters";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
  Settings as SettingsIcon,
  SlidersHorizontal,
  List,
  Play,
  Pause,
  Square,
  Repeat,
  SkipBack,
  SkipForward,
  Mic2,
  Loader2,
  Minus,
  Plus,
  Check,
  X,
  Palette,
  Languages,
} from "lucide-react";
import { DEFAULT_MUSHAF, MUSHAFS, type MushafId } from "@/lib/mushafs";
import { useAudioSync } from "./useAudioSync";
import { ReciterPicker } from "./ReciterPicker";
import { AudioSettingsModal } from "./AudioSettingsModal";
import { useSettings, useLastRead, useBookmarks, useLastPlayed } from "@/lib/storage";
import { AYAH_COUNTS, juzForPage } from "@/lib/quran-meta";
import { useT } from "@/lib/i18n/I18nProvider";
import { ThemeSegmented } from "@/components/theme/ThemeControls";
import "@/styles/mushaf.css";

const TAJWEED_LEGEND: {
  sample: string;
  color: string;
  name: string;
  desc: string;
}[] = [
  { sample: "نّ", color: "var(--tj-ghunnah)", name: "Ghunnah", desc: "Nasal sound held ~2 counts" },
  { sample: "نْ", color: "var(--tj-ikhfa)", name: "Ikhfa / Iqlab", desc: "Letter hidden with a nasal sound" },
  { sample: "ق", color: "var(--tj-qalqalah)", name: "Qalqalah", desc: "Echoing / bouncing sound" },
  { sample: "ـٰ", color: "var(--tj-madd2)", name: "Madd — natural", desc: "Prolong 2 counts" },
  { sample: "آ", color: "var(--tj-madd246)", name: "Madd — permissible", desc: "Prolong 2, 4 or 6 counts" },
  { sample: "آ", color: "var(--tj-madd45)", name: "Madd — obligatory", desc: "Prolong 4–5 counts" },
  { sample: "آ", color: "var(--tj-madd6)", name: "Madd — necessary", desc: "Prolong 6 counts" },
  { sample: "ٱ", color: "var(--tj-silent)", name: "Silent", desc: "Not pronounced (hamzat wasl, etc.)" },
];

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface ChapterName {
  english: string;
  arabic: string;
}

interface MushafPageProps {
  pageNumber: number;
  words: PageWord[];
  chapterIds: number[];
  chapterNames: Record<number, ChapterName>;
  tajweedWords: Record<string, string>;
}

export function MushafPage({
  pageNumber,
  words,
  chapterIds,
  chapterNames,
  tajweedWords,
}: MushafPageProps) {
  const t = useT();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Persistent state ─────────────────────────────────────────────
  const { settings, update } = useSettings();
  const [, setLastRead] = useLastRead();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [, setLastPlayed] = useLastPlayed();
  const [showReadingOptions, setShowReadingOptions] = useState(false);
  const [showTajweedLegend, setShowTajweedLegend] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  // ── Mushaf selector state ─────────────────────────────────────────
  const [selectedMushaf, setSelectedMushaf] = useState<MushafId>(DEFAULT_MUSHAF);

  // ── Reciter state ───────────────────────────────────────────────
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(DEFAULT_RECITER);
  const [showPicker, setShowPicker] = useState(false);

  // ── Audio + segments state (fetched client-side) ────────────────
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [segments, setSegments] = useState<TimingSegment[]>([]);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);

  const primaryChapterId = chapterIds[0] ?? 1;
  const primaryName = chapterNames[primaryChapterId]?.english ?? `Surah ${primaryChapterId}`;
  // The Tajweed toggle is the single source of truth (works on any edition,
  // data is bundled offline so it applies instantly).
  const tajweedActive = settings.tajweed;

  // ── Persist last-read position & reading progress ────────────────
  useEffect(() => {
    setLastRead({
      page: pageNumber,
      surahId: primaryChapterId,
      surahName: primaryName,
      updatedAt: Date.now(),
    });
    // Record the page as visited for the reading-progress ring.
    try {
      const raw = localStorage.getItem("tartil:progress");
      const pages: number[] = raw ? JSON.parse(raw) : [];
      if (!pages.includes(pageNumber)) {
        localStorage.setItem(
          "tartil:progress",
          JSON.stringify([...pages, pageNumber])
        );
        window.dispatchEvent(
          new CustomEvent("tartil:storage", { detail: { key: "progress" } })
        );
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, primaryChapterId, primaryName]);

  // ── Fetch audio when reciter or chapter changes ─────────────────
  const loadAudio = useCallback(async (reciter: Reciter, chapterId: number) => {
    setAudioLoading(true);
    setAudioError(null);
    try {
      const data = await fetchChapterAudio(reciter.id, chapterId);
      setAudioUrl(data.audioUrl);
      setSegments(data.segments);
    } catch (err) {
      console.error("Failed to load audio:", err);
      setAudioError("Failed to load recitation audio");
      setAudioUrl("");
      setSegments([]);
    } finally {
      setAudioLoading(false);
    }
  }, []);

  // Load audio on mount and when reciter changes
  useEffect(() => {
    if (chapterIds.length === 0) return;
    setSelectedChapterId((prev) =>
      prev && chapterIds.includes(prev) ? prev : chapterIds[0]
    );
  }, [chapterIds]);

  useEffect(() => {
    if (!selectedChapterId) return;
    loadAudio(selectedReciter, selectedChapterId);
  }, [selectedReciter, selectedChapterId, loadAudio]);

  // ── Audio sync hook ─────────────────────────────────────────────
  const {
    audioRef,
    activeWord,
    isPlaying,
    isLooping,
    currentTime,
    duration,
    play,
    toggle,
    stop,
    seekToSeconds,
    setLoop,
  } = useAudioSync(segments);

  useEffect(() => {
    const m = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("mushafId="))
      ?.split("=")[1] as MushafId | undefined;
    if (m && MUSHAFS.some((x) => x.id === m)) setSelectedMushaf(m);
  }, []);

  // Editions differ only by font (+ tajweed colouring), which is reactive —
  // switch instantly (no reload) and persist the choice in a cookie.
  const chooseMushaf = useCallback((id: MushafId) => {
    setSelectedMushaf(id);
    fetch("/api/mushaf/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mushafId: id }),
    }).catch(() => {});
  }, []);

  // Tajweed data now arrives as a prop (bundled offline, server-built).

  // ── Handle reciter change ───────────────────────────────────────
  const handleReciterChange = useCallback((reciter: Reciter) => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    setSelectedReciter(reciter);
  }, [audioRef]);

  // ── Group words by line ─────────────────────────────────────────
  const lines = useMemo(() => groupWordsByLine(words), [words]);
  const lineNumbers = useMemo(
    () => Object.keys(lines).map(Number).sort((a, b) => a - b),
    [lines]
  );

  // ── Past words for dimming ──────────────────────────────────────
  const pastWords = useMemo(() => {
    if (!activeWord) return new Set<string>();
    const past = new Set<string>();
    for (const seg of segments) {
      if (seg.endMs < currentTime * 1000) {
        past.add(`${seg.verseKey}:${seg.wordPosition}`);
      }
    }
    return past;
  }, [activeWord, segments, currentTime]);

  // ── Page-bounded playback ───────────────────────────────────────
  // The audio file is the whole chapter, so to start at the *page* we seek
  // to the first ayah that appears on this page (fixes "always starts at 2:1").
  const pageFirstVerse = useMemo(
    () => words.find((w) => w.charType === "word")?.verseKey ?? null,
    [words]
  );
  const pageLastVerse = useMemo(() => {
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].charType === "word") return words[i].verseKey;
    }
    return null;
  }, [words]);

  // ── Start / End ayah selection (bounds the recitation) ───────────────
  const pageFirstAyah = pageFirstVerse
    ? parseInt(pageFirstVerse.split(":")[1], 10)
    : 1;
  const surahAyahCount = AYAH_COUNTS[primaryChapterId] ?? 1;
  const [startAyah, setStartAyah] = useState(pageFirstAyah);
  const [endAyah, setEndAyah] = useState(surahAyahCount);
  // Carry the chosen End ayah across auto page-advances within the surah.
  useEffect(() => {
    const e = sessionStorage.getItem("qa:endAyah");
    const s = sessionStorage.getItem("qa:endSurah");
    if (e && s && Number(s) === primaryChapterId) {
      const n = Number(e);
      if (n >= 1 && n <= surahAyahCount) setEndAyah(n);
    }
  }, [primaryChapterId, surahAyahCount]);

  const verseStartMs = useCallback(
    (verseKey: string | null) => {
      if (!verseKey) return null;
      let min: number | null = null;
      for (const s of segments) {
        if (s.verseKey === verseKey && (min == null || s.startMs < min)) min = s.startMs;
      }
      return min;
    },
    [segments]
  );
  const verseEndMs = useCallback(
    (verseKey: string | null) => {
      if (!verseKey) return null;
      let max: number | null = null;
      for (const s of segments) {
        if (s.verseKey === verseKey && (max == null || s.endMs > max)) max = s.endMs;
      }
      return max;
    },
    [segments]
  );

  const startPlaybackFromPage = useCallback(() => {
    const startMs = verseStartMs(pageFirstVerse);
    if (startMs != null) seekToSeconds(startMs / 1000);
    setIsPlaybackActive(true);
    play();
    if (pageFirstVerse) {
      setLastPlayed({
        reciterId: selectedReciter.id,
        reciterName: selectedReciter.name,
        surahId: primaryChapterId,
        surahName: primaryName,
        page: pageNumber,
        verseKey: pageFirstVerse,
        updatedAt: Date.now(),
      });
    }
  }, [
    verseStartMs,
    pageFirstVerse,
    seekToSeconds,
    play,
    selectedReciter,
    primaryChapterId,
    primaryName,
    pageNumber,
    setLastPlayed,
  ]);

  // Continue playing across pages: arriving with the autoplay flag set
  // resumes recitation from this page's first ayah once audio is ready.
  const [pendingAutoplay, setPendingAutoplay] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("qa:autoplay") === "1") {
      sessionStorage.removeItem("qa:autoplay");
      setPendingAutoplay(true);
    }
  }, []);
  useEffect(() => {
    if (pendingAutoplay && !audioLoading && !audioError && audioUrl && segments.length) {
      setPendingAutoplay(false);
      startPlaybackFromPage();
    }
  }, [pendingAutoplay, audioLoading, audioError, audioUrl, segments, startPlaybackFromPage]);

  // While playing, stop at the chosen end ayah; otherwise turn the page so the
  // displayed page follows the recitation across page boundaries.
  useEffect(() => {
    if (!isPlaybackActive || !isPlaying) return;

    // 1) Reached the selected End ayah → stop.
    const targetEndMs = verseEndMs(`${primaryChapterId}:${endAyah}`);
    if (targetEndMs != null && currentTime * 1000 >= targetEndMs - 60) {
      stop();
      setIsPlaybackActive(false);
      sessionStorage.removeItem("qa:endAyah");
      sessionStorage.removeItem("qa:endSurah");
      return;
    }

    // 2) Finished this page (End ayah is further on) → advance & keep playing.
    const pageEndMs = verseEndMs(pageLastVerse);
    if (pageEndMs != null && currentTime * 1000 >= pageEndMs - 60) {
      if (pageNumber < 604) {
        sessionStorage.setItem("qa:autoplay", "1");
        sessionStorage.setItem("qa:endAyah", String(endAyah));
        sessionStorage.setItem("qa:endSurah", String(primaryChapterId));
        router.push(`/mushaf/${pageNumber + 1}`);
      } else {
        stop();
        setIsPlaybackActive(false);
      }
    }
  }, [
    currentTime,
    isPlaying,
    isPlaybackActive,
    verseEndMs,
    pageLastVerse,
    endAyah,
    primaryChapterId,
    pageNumber,
    router,
    stop,
  ]);

  // Seek backward/forward one word during playback (the ◁ ▷ controls).
  const seekWord = (delta: number) => {
    const audio = audioRef.current;
    if (!audio || segments.length === 0) return;
    const tMs = audio.currentTime * 1000;
    let idx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].startMs <= tMs + 1) idx = i;
      else break;
    }
    const target = Math.max(0, Math.min(segments.length - 1, idx + delta));
    seekToSeconds(segments[target].startMs / 1000);
  };

  const startVerseLabel = `${primaryName} ${startAyah}`;
  const endVerseLabel =
    endAyah >= surahAyahCount ? t("audio.end_of_surah") : `${primaryName} ${endAyah}`;

  // ── Auto-scroll to active word ──────────────────────────────────
  useEffect(() => {
    if (!settings.highlightWhilePlaying || !activeWord || !containerRef.current) return;
    const el = containerRef.current.querySelector(".mushaf-word-active");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeWord, settings.highlightWhilePlaying]);

  // ── Fit each line to the page width ─────────────────────────────
  // Words inherit the line's font-size; shrink any line that would overflow so
  // every line fills the width without clipping (justified, like print).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const fit = () => {
      container.querySelectorAll<HTMLElement>(".mushaf-line").forEach((line) => {
        line.style.fontSize = "";
        const avail = line.clientWidth;
        if (!avail) return;
        const natural = line.scrollWidth;
        if (natural > avail + 1) {
          const cur = parseFloat(getComputedStyle(line).fontSize);
          line.style.fontSize = `${Math.max(11, (cur * avail * 0.98) / natural)}px`;
        }
      });
    };
    fit();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [words, settings.arabicFontScale, selectedMushaf, tajweedWords]);

  // Timer + scrubber reflect *this page's* slice of the full-surah audio file
  // (which can be ~2 hours), not the whole file.
  const pageStartSec = (verseStartMs(pageFirstVerse) ?? 0) / 1000;
  const pageEndMsForTimer = verseEndMs(pageLastVerse);
  const pageEndSec = pageEndMsForTimer != null ? pageEndMsForTimer / 1000 : duration;
  const pageDuration = Math.max(0, pageEndSec - pageStartSec);
  const pageElapsed = Math.max(0, Math.min(pageDuration, currentTime - pageStartSec));
  const pageProgress = pageDuration > 0 ? (pageElapsed / pageDuration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToSeconds(pageStartSec + fraction * pageDuration);
  };

  const mushafInfo = useMemo(
    () => MUSHAFS.find((m) => m.id === selectedMushaf) || MUSHAFS[0],
    [selectedMushaf]
  );

  const handlePrev = () => {
    if (pageNumber > 1) router.push(`/mushaf/${pageNumber - 1}`);
  };
  const handleNext = () => {
    if (pageNumber < 604) router.push(`/mushaf/${pageNumber + 1}`);
  };

  // Swipe left/right to turn pages (left → next, right → previous).
  const swipe = useRef({ x: 0, y: 0, moved: false });
  const onPageTouchStart = (e: React.TouchEvent) => {
    const tch = e.touches[0];
    swipe.current = { x: tch.clientX, y: tch.clientY, moved: false };
  };
  const onPageTouchEnd = (e: React.TouchEvent) => {
    const tch = e.changedTouches[0];
    const dx = tch.clientX - swipe.current.x;
    const dy = tch.clientY - swipe.current.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swipe.current.moved = true;
      if (dx < 0) handleNext();
      else handlePrev();
    }
  };
  const onPageClick = () => {
    // A swipe shouldn't also toggle the immersive chrome.
    if (swipe.current.moved) {
      swipe.current.moved = false;
      return;
    }
    setChromeHidden((h) => !h);
  };

  const bookmarked = isBookmarked(pageNumber);
  const onToggleBookmark = () =>
    toggleBookmark({
      page: pageNumber,
      surahId: primaryChapterId,
      surahName: primaryName,
      createdAt: Date.now(),
    });

  const renderWordContent = (word: PageWord) => {
    if (word.charType === "end") {
      return `۝${word.textUthmani || ""}`;
    }
    const plain = word.textUthmani || word.codeV1;
    if (!tajweedActive) return <span>{plain}</span>;
    // Authoritative Tajweed markup from Quran.com — render its tags as-is,
    // with no invented colouring.
    const tajweedText = tajweedWords[`${word.verseKey}:${word.position}`];
    if (!tajweedText) return <span>{plain}</span>;
    const html = tajweedText
      .replace(/<tajweed/g, "<span")
      .replace(/<\/tajweed>/g, "</span>")
      .replace(/class=([^ >]+)/g, 'class="$1"');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Track which surah bands have been rendered (one per surah per page).
  const shownBands = new Set<number>();

  return (
    <div
      className={`mushaf-screen flex min-h-screen flex-col ${mushafInfo.className}${
        chromeHidden ? " chrome-hidden" : ""
      }`}
      style={{ ["--arabic-scale" as string]: String(settings.arabicFontScale) }}
    >
      {/* ── Top bar ──────────────────────────────────────── */}
      <div className="mushaf-top-nav">
        <button className="mushaf-top-btn" onClick={() => router.push("/suras")} aria-label="Back">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="mushaf-top-title">
          <span className="mushaf-top-title-main">
            {primaryName} · {t("browse.juz", { n: juzForPage(pageNumber) })}
          </span>
          <span className="mushaf-top-title-sub">
            {t("common.page")} {pageNumber}
          </span>
        </div>
        <button
          className="mushaf-top-btn"
          onClick={() => setShowReadingOptions(true)}
          aria-label="Reading options"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
        <button
          className="mushaf-top-btn"
          data-active={bookmarked}
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
        >
          {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </button>
        <Link className="mushaf-top-btn" href="/settings" aria-label="Settings">
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </div>

      {/* ── Page (tap to toggle immersive mode · swipe to turn pages) ── */}
      <div
        className="relative flex flex-1 justify-center"
        onClick={onPageClick}
        onTouchStart={onPageTouchStart}
        onTouchEnd={onPageTouchEnd}
      >
        <div className="mushaf-page" ref={containerRef}>
          <div className="mushaf-border-container" />

          <div className="relative z-10">
            {lineNumbers.map((lineNum) => {
              const lineWords = lines[lineNum];
              const first = lineWords[0];
              let band: React.ReactNode = null;
              if (
                first &&
                first.position === 1 &&
                first.verseKey.endsWith(":1")
              ) {
                const sid = parseInt(first.verseKey.split(":")[0], 10);
                if (!shownBands.has(sid) && chapterNames[sid]) {
                  shownBands.add(sid);
                  // Surah name framed by divider rules (separates surahs sharing
                  // a page), then the Bismillah (except Al-Faatiha & At-Tawba).
                  band = (
                    <div className="mushaf-surah-band" key={`band-${sid}`}>
                      <div className="mushaf-surah-head">
                        <span className="mushaf-surah-name">
                          {chapterNames[sid].arabic}
                        </span>
                      </div>
                      {sid !== 1 && sid !== 9 && (
                        <div className="mushaf-basmalah">
                          بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  );
                }
              }
              // Justify full lines; centre surah-ending and short lines (print style).
              const realCount = lineWords.filter((w) => w.charType === "word").length;
              const endsSurah = lineWords.some((w) => {
                if (w.charType !== "end") return false;
                const [s, a] = w.verseKey.split(":").map(Number);
                return a === AYAH_COUNTS[s];
              });
              const centerLine = endsSurah || realCount <= 4;
              return (
                <div key={lineNum}>
                  {band}
                  <div className={`mushaf-line${centerLine ? " mushaf-line-center" : ""}`}>
                    {lineWords.map((word, idx) => {
                      const wordKey = `${word.verseKey}:${word.position}`;
                      const highlight = settings.highlightWhilePlaying;
                      const isActive =
                        highlight &&
                        activeWord?.verseKey === word.verseKey &&
                        activeWord?.wordPosition === word.position;
                      const isPast = highlight && pastWords.has(wordKey);
                      return (
                        <span
                          key={`${wordKey}-${idx}`}
                          className={[
                            "mushaf-word",
                            word.charType === "end" ? "mushaf-word-end" : "",
                            isActive ? "mushaf-word-active" : "",
                            isPast && !isActive ? "mushaf-word-past" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          data-verse={word.verseKey}
                          data-position={word.position}
                        >
                          {renderWordContent(word)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ───────────────────────────────────── */}
      <div className="mushaf-bottom-nav">
        {!isPlaybackActive ? (
          <>
            <Link href="/suras" className="mushaf-nav-item">
              <List className="h-5 w-5" />
              <span>{t("reader.contents")}</span>
            </Link>
            <button className="mushaf-nav-item" onClick={() => setShowPicker(true)}>
              <Mic2 className="h-5 w-5" />
              <span>{t("reader.reciter")}</span>
            </button>
            <button
              className="mushaf-nav-fab"
              onClick={() => setShowAudioSettings(true)}
              aria-label="Play audio"
            >
              <span className="mushaf-nav-fab-circle">
                <Play className="h-5 w-5" fill="currentColor" />
              </span>
              <span>{t("reader.play")}</span>
            </button>
            <button className="mushaf-nav-item" onClick={handlePrev} disabled={pageNumber <= 1}>
              <SkipBack className="h-5 w-5" />
              <span>{t("reader.prev")}</span>
            </button>
            <button className="mushaf-nav-item" onClick={handleNext} disabled={pageNumber >= 604}>
              <SkipForward className="h-5 w-5" />
              <span>{t("reader.next")}</span>
            </button>
          </>
        ) : (
          <div className="mushaf-audio-panel">
            <div className="mushaf-audio-progress-row">
              <span className="mushaf-audio-time">{fmtTime(pageElapsed)}</span>
              <div className="mushaf-audio-progress" onClick={handleProgressClick}>
                <div
                  className="mushaf-audio-progress-fill"
                  style={{ width: `${pageProgress}%` }}
                />
              </div>
              <span className="mushaf-audio-time">{fmtTime(pageDuration)}</span>
            </div>
            <div className="mushaf-audio-controls">
              <button className="mushaf-nav-btn" onClick={() => seekWord(-1)} aria-label="Previous word">
              <SkipBack className="h-5 w-5" />
            </button>
            <button className="mushaf-nav-btn" onClick={() => setShowPicker(true)} aria-label="Reciter">
              <Mic2 className="h-5 w-5" />
            </button>
            <button
              className="mushaf-nav-btn mushaf-play-btn"
              onClick={toggle}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {audioLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" fill="currentColor" />
              ) : (
                <Play className="h-6 w-6" fill="currentColor" />
              )}
            </button>
            <button
              className={`mushaf-nav-btn ${isLooping ? "mushaf-nav-btn-active" : ""}`}
              onClick={() => setLoop(!isLooping)}
              aria-label="Repeat"
            >
              <Repeat className="h-5 w-5" />
            </button>
            <button
              className="mushaf-nav-btn"
              onClick={() => {
                stop();
                setIsPlaybackActive(false);
              }}
              aria-label="Stop"
            >
              <Square className="h-5 w-5" fill="currentColor" />
            </button>
              <button className="mushaf-nav-btn" onClick={() => seekWord(1)} aria-label="Next word">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating page pill — visible only in immersive mode ──── */}
      <div className="mushaf-page-pill" aria-hidden>
        {primaryName} · {t("common.page")} {pageNumber}
      </div>

      {/* ── Error banner (only while the user is trying to play) ── */}
      {audioError && isPlaybackActive && (
        <div className="mushaf-error">
          {audioError}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* ── Reciter picker ───────────────────────────────── */}
      {showPicker && (
        <ReciterPicker
          currentReciter={selectedReciter}
          onSelect={handleReciterChange}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* ── Audio settings ───────────────────────────────── */}
      {showAudioSettings && (
        <AudioSettingsModal
          onClose={() => setShowAudioSettings(false)}
          onPlay={() => {
            setShowAudioSettings(false);
            const startMs = verseStartMs(`${primaryChapterId}:${startAyah}`);
            if (startMs != null) seekToSeconds(startMs / 1000);
            sessionStorage.setItem("qa:endAyah", String(endAyah));
            sessionStorage.setItem("qa:endSurah", String(primaryChapterId));
            setIsPlaybackActive(true);
            play();
            setLastPlayed({
              reciterId: selectedReciter.id,
              reciterName: selectedReciter.name,
              surahId: primaryChapterId,
              surahName: primaryName,
              page: pageNumber,
              verseKey: `${primaryChapterId}:${startAyah}`,
              updatedAt: Date.now(),
            });
          }}
          currentChapterId={primaryChapterId}
          currentChapterName={primaryName}
          ayahCount={surahAyahCount}
          startAyah={startAyah}
          endAyah={endAyah}
          startLabel={startVerseLabel}
          endLabel={endVerseLabel}
          onChangeStart={(n) => {
            setStartAyah(n);
            if (n > endAyah) setEndAyah(n);
          }}
          onChangeEnd={(n) => {
            setEndAyah(n);
            if (n < startAyah) setStartAyah(n);
          }}
          currentReciter={selectedReciter}
          onChooseReciter={() => {
            setShowAudioSettings(false);
            setShowPicker(true);
          }}
          isLooping={isLooping}
          onToggleLoop={() => setLoop(!isLooping)}
        />
      )}

      {/* ── Reading options sheet ────────────────────────── */}
      {showReadingOptions && (
        <div className="reciter-overlay" onClick={() => setShowReadingOptions(false)}>
          <div className="reciter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reciter-modal-header">
              <h2>{t("reader.reading_options")}</h2>
              <button onClick={() => setShowReadingOptions(false)} className="reciter-close-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="reciter-list">
              <div className="ro-row">
                <span className="ro-label">{t("reader.font_size")}</span>
                <div className="ro-stepper">
                  <button
                    onClick={() =>
                      update({
                        arabicFontScale: Math.max(
                          0.8,
                          Math.round((settings.arabicFontScale - 0.1) * 10) / 10
                        ),
                      })
                    }
                    aria-label="Smaller"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="ro-value">
                    {Math.round(settings.arabicFontScale * 100)}%
                  </span>
                  <button
                    onClick={() =>
                      update({
                        arabicFontScale: Math.min(
                          1.6,
                          Math.round((settings.arabicFontScale + 0.1) * 10) / 10
                        ),
                      })
                    }
                    aria-label="Larger"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="ro-theme">
                <span className="ro-label">{t("reader.theme")}</span>
                <ThemeSegmented />
              </div>

              <div className="ro-row">
                <span className="ro-label">{t("reader.tajweed")}</span>
                <span
                  className="switch"
                  data-on={settings.tajweed}
                  role="switch"
                  aria-checked={settings.tajweed}
                  onClick={() => update({ tajweed: !settings.tajweed })}
                />
              </div>
              <button
                className="ro-row ro-link"
                onClick={() => setShowTajweedLegend(true)}
              >
                <span className="ro-label inline-flex items-center gap-2">
                  <Palette className="h-4 w-4" /> {t("reader.tajweed_legend")}
                </span>
                <span className="text-muted-foreground">›</span>
              </button>

              <button
                className="ro-row ro-link"
                onClick={() => router.push(`/read/${primaryChapterId}`)}
              >
                <span className="ro-label inline-flex items-center gap-2">
                  <Languages className="h-4 w-4" /> {t("reader.read_translation")}
                </span>
                <span className="text-muted-foreground">›</span>
              </button>

              <div className="ro-section-label">{t("reader.mushaf_edition")}</div>
              {MUSHAFS.map((m) => {
                const isActive = m.id === selectedMushaf;
                return (
                  <button
                    key={m.id}
                    className={`reciter-item ${isActive ? "reciter-item-active" : ""}`}
                    onClick={() => chooseMushaf(m.id)}
                  >
                    <div className="reciter-item-info">
                      <span className="reciter-item-name">{m.title}</span>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tajweed legend ───────────────────────────────── */}
      {showTajweedLegend && (
        <div className="reciter-overlay" onClick={() => setShowTajweedLegend(false)}>
          <div className="reciter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reciter-modal-header">
              <h2>{t("reader.tajweed_legend")}</h2>
              <button onClick={() => setShowTajweedLegend(false)} className="reciter-close-btn">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="tj-legend-list">
              {TAJWEED_LEGEND.map((t) => (
                <div key={t.name} className="tj-legend-item">
                  <span className="tj-legend-swatch" style={{ color: t.color }}>
                    {t.sample}
                  </span>
                  <span className="flex flex-col">
                    <span className="tj-legend-name">{t.name}</span>
                    <span className="tj-legend-desc">{t.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="auto"
        onError={() => setAudioError("Audio failed to load")}
      />
    </div>
  );
}
