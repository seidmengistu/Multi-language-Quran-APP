/**
 * Quran Page API — Fetches page layout text data only.
 * Audio fetching has been moved to audio-api.ts.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface PageWord {
  verseKey: string;       // e.g. "1:1"
  position: number;       // word index within the verse (1-based)
  lineNumber: number;     // which line on the Mushaf page
  codeV1: string;         // QCF glyph character (fallback)
  textUthmani: string;    // readable Arabic text
  charType: "word" | "end"; // "end" = verse-number marker
}

// ─── Group Words by Line ────────────────────────────────────────────

export function groupWordsByLine(words: PageWord[]): Record<number, PageWord[]> {
  const lines: Record<number, PageWord[]> = {};
  for (const word of words) {
    if (!lines[word.lineNumber]) {
      lines[word.lineNumber] = [];
    }
    lines[word.lineNumber].push(word);
  }
  return lines;
}

// ─── Detect Chapters from Page ──────────────────────────────────────

export function detectChaptersFromPage(words: PageWord[]): number[] {
  const chapters = new Set<number>();
  for (const word of words) {
    chapters.add(parseInt(word.verseKey.split(":")[0], 10));
  }
  return Array.from(chapters).sort((a, b) => a - b);
}
