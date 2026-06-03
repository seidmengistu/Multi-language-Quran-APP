import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";

type LocalPages = Record<string, { ayahs: string[] }>;

let cached: Promise<Record<number, number>> | null = null;

export async function getSurahStartPages(): Promise<Record<number, number>> {
  if (cached) return cached;
  cached = (async () => {
    const pagesPath = join(process.cwd(), "public", "data", "pages.json");
    const raw = await readFile(pagesPath, "utf8");
    const pages: LocalPages = JSON.parse(raw);

    const starts: Record<number, number> = {};

    for (const [pageStr, page] of Object.entries(pages)) {
      const pageNum = Number(pageStr);
      if (!Number.isFinite(pageNum)) continue;
      for (const ayah of page.ayahs || []) {
        const surahId = Number(String(ayah).split(":")[0]);
        if (!Number.isFinite(surahId)) continue;
        const prev = starts[surahId];
        if (prev == null || pageNum < prev) starts[surahId] = pageNum;
      }
    }

    return starts;
  })();
  return cached;
}

