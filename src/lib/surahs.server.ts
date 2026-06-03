import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import { ayahCount } from "./quran-meta";
import { getSurahStartPages } from "./surah-start.server";

export interface SurahMeta {
  id: number;
  nameArabic: string;
  nameEnglish: string;
  nameTranslation: string;
  revelationType: string;
}

export interface SurahIndexEntry extends SurahMeta {
  ayahCount: number;
  startPage: number;
}

type QuranJson = {
  surahs: Record<
    string,
    {
      name: string;
      englishName: string;
      englishNameTranslation: string;
      revelationType: string;
    }
  >;
};

export async function getSurahs(): Promise<SurahMeta[]> {
  const p = join(process.cwd(), "public", "data", "quran.json");
  const raw = await readFile(p, "utf8");
  const data: QuranJson = JSON.parse(raw);

  return Object.entries(data.surahs)
    .map(([id, s]) => ({
      id: Number(id),
      nameArabic: s.name,
      nameEnglish: s.englishName,
      nameTranslation: s.englishNameTranslation,
      revelationType: s.revelationType,
    }))
    .sort((a, b) => a.id - b.id);
}

/**
 * Full browse index: surah metadata enriched with ayah count (canonical
 * constant) and the page each surah begins on (derived from the page data).
 */
export async function getSurahIndex(): Promise<SurahIndexEntry[]> {
  const [surahs, startPages] = await Promise.all([
    getSurahs(),
    getSurahStartPages(),
  ]);
  return surahs.map((s) => ({
    ...s,
    ayahCount: ayahCount(s.id),
    startPage: startPages[s.id] ?? 1,
  }));
}

