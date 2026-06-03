import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import { AYAH_COUNTS } from "./quran-meta";

/** verseKey -> text. Loaded once and cached for the process lifetime. */
let versesCache: Promise<Record<string, string>> | null = null;
const translationCache = new Map<number, Promise<Record<string, string>>>();

function loadVerses(): Promise<Record<string, string>> {
  if (!versesCache) {
    versesCache = readFile(
      join(process.cwd(), "public", "data", "verses.json"),
      "utf8"
    ).then((raw) => JSON.parse(raw) as Record<string, string>);
  }
  return versesCache;
}

function loadTranslation(id: number): Promise<Record<string, string>> {
  let cached = translationCache.get(id);
  if (!cached) {
    cached = readFile(
      join(process.cwd(), "public", "data", "translations", `${id}.json`),
      "utf8"
    )
      .then((raw) => JSON.parse(raw) as Record<string, string>)
      .catch(() => ({}));
    translationCache.set(id, cached);
  }
  return cached;
}

export interface VerseRow {
  verseKey: string;
  ayah: number;
  arabic: string;
  translation: string;
}

export async function getSurahVerses(
  surahId: number,
  translationId: number
): Promise<VerseRow[]> {
  const [verses, tr] = await Promise.all([
    loadVerses(),
    loadTranslation(translationId),
  ]);
  const count = AYAH_COUNTS[surahId] ?? 0;
  const rows: VerseRow[] = [];
  for (let a = 1; a <= count; a++) {
    const key = `${surahId}:${a}`;
    rows.push({
      verseKey: key,
      ayah: a,
      arabic: verses[key] ?? "",
      translation: tr[key] ?? "",
    });
  }
  return rows;
}

/** A single verse — used by the dashboard's Daily Ayah. */
export async function getVerse(
  verseKey: string,
  translationId: number
): Promise<VerseRow | null> {
  const [verses, tr] = await Promise.all([
    loadVerses(),
    loadTranslation(translationId),
  ]);
  if (!verses[verseKey]) return null;
  return {
    verseKey,
    ayah: Number(verseKey.split(":")[1]),
    arabic: verses[verseKey],
    translation: tr[verseKey] ?? "",
  };
}
