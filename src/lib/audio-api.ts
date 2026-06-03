/**
 * Audio API — resolves a streamable recitation URL + word-level timing
 * segments for a chapter.
 *
 * Order of preference:
 *   1. Stream from QuranCDN via `/api/audio/resolve` (works online, incl. on
 *      serverless hosting — no local files needed).
 *   2. A locally downloaded per-reciter file (offline).
 *   3. Bundled `public/data/timings.json` (highlighting only) + local mp3 path.
 */

export interface TimingSegment {
  verseKey: string;
  wordPosition: number;
  startMs: number;
  endMs: number;
}

export interface ChapterAudio {
  reciterId: number;
  chapterId: number;
  audioUrl: string;
  segments: TimingSegment[];
}

type VerseTimings = Array<{
  verse_key: string;
  segments: Array<[number, number, number]>;
}>;

const pad3 = (n: number) => String(n).padStart(3, "0");

function parseVerseTimings(verseTimings: VerseTimings | undefined): TimingSegment[] {
  const segments: TimingSegment[] = [];
  for (const vt of verseTimings || []) {
    for (const seg of vt.segments || []) {
      if (Array.isArray(seg) && seg.length >= 3) {
        segments.push({
          verseKey: vt.verse_key,
          wordPosition: seg[0],
          startMs: seg[1],
          endMs: seg[2],
        });
      }
    }
  }
  segments.sort((a, b) => a.startMs - b.startMs);
  return segments;
}

export async function fetchChapterAudio(
  reciterId: number,
  chapterId: number
): Promise<ChapterAudio> {
  // 1) Stream from QuranCDN (canonical; works online and on Vercel).
  try {
    const res = await fetch(
      `/api/audio/resolve?reciterId=${reciterId}&chapterId=${chapterId}`
    );
    if (res.ok) {
      const data: { audioUrl?: string; verse_timings?: VerseTimings } =
        await res.json();
      if (data.audioUrl) {
        return {
          reciterId,
          chapterId,
          audioUrl: data.audioUrl,
          segments: parseVerseTimings(data.verse_timings),
        };
      }
    }
  } catch {
    /* offline or unreachable — fall back to local files below */
  }

  // 2) Locally downloaded per-reciter file (offline use).
  try {
    const segRes = await fetch(`/audio/${reciterId}/${pad3(chapterId)}.segments.json`);
    if (segRes.ok) {
      const segData: { verse_timings?: VerseTimings } = await segRes.json();
      return {
        reciterId,
        chapterId,
        audioUrl: `/audio/${reciterId}/${pad3(chapterId)}.mp3`,
        segments: parseVerseTimings(segData.verse_timings),
      };
    }
  } catch {
    /* fall back to bundled timings below */
  }

  // 3) Last resort: bundled timings (highlighting only) + local mp3 path.
  type LocalTimings = {
    timings: Record<string, { segments: Array<[number, number, number]> }>;
  };
  const data: LocalTimings = await (await fetch("/data/timings.json")).json();
  const segments: TimingSegment[] = [];
  const prefix = `${chapterId}:`;
  for (const [verseKey, t] of Object.entries(data.timings)) {
    if (!verseKey.startsWith(prefix)) continue;
    for (const seg of t.segments || []) {
      if (Array.isArray(seg) && seg.length >= 3) {
        segments.push({ verseKey, wordPosition: seg[0], startMs: seg[1], endMs: seg[2] });
      }
    }
  }
  segments.sort((a, b) => a.startMs - b.startMs);

  return {
    reciterId,
    chapterId,
    audioUrl: `/audio/${reciterId}/${pad3(chapterId)}.mp3`,
    segments,
  };
}
