import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import type { PageWord } from "./quran-page-api";
import { cookies } from "next/headers";
import { DEFAULT_MUSHAF, type MushafId } from "@/lib/mushafs";

type LocalPageWord = { v: string; p: number; l: number; t: string; c: "w" | "e" };
type LocalPages = Record<string, { ayahs: string[]; words: LocalPageWord[] }>;

export async function fetchPageWords(pageNumber: number): Promise<PageWord[]> {
  const c = await cookies();
  const mushafId = (c.get("mushafId")?.value as MushafId | undefined) ?? DEFAULT_MUSHAF;

  // Currently all 3 mushafs share the same local dataset.
  // If you later add distinct datasets, map `mushafId` to its own pages.json here.
  const pagesPath = join(process.cwd(), "public", "data", "pages.json");
  const raw = await readFile(pagesPath, "utf8");
  const pages: LocalPages = JSON.parse(raw);

  const page = pages[String(pageNumber)];
  if (!page) throw new Error(`Failed to load local page ${pageNumber}`);

  return page.words.map((w) => ({
    verseKey: w.v,
    position: w.p,
    lineNumber: w.l,
    codeV1: w.t,
    textUthmani: w.t,
    charType: w.c === "e" ? "end" : "word",
  }));
}

