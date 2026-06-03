import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import type { PageWord } from "./quran-page-api";

/** verseKey -> tajweed-tagged text. Loaded once, cached for the process. */
let cache: Promise<Record<string, string>> | null = null;

function load(): Promise<Record<string, string>> {
  if (!cache) {
    cache = readFile(
      join(process.cwd(), "public", "data", "tajweed.json"),
      "utf8"
    )
      .then((raw) => JSON.parse(raw) as Record<string, string>)
      .catch(() => ({}));
  }
  return cache;
}

/**
 * Build a `"verseKey:position" -> tagged word` map for the words on a page,
 * so the reader has Tajweed data ready offline (no client fetch). Each verse's
 * tagged text is split into words the same way the data is positioned.
 */
export async function getTajweedForPage(
  words: PageWord[]
): Promise<Record<string, string>> {
  const tajweed = await load();
  const out: Record<string, string> = {};
  const verses = new Set<string>();
  for (const w of words) if (w.charType === "word") verses.add(w.verseKey);
  for (const vk of verses) {
    const text = tajweed[vk];
    if (!text) continue;
    const taggedWords = text.match(/(?:<[^>]+>|[^ ])+/g) || [];
    taggedWords.forEach((word, idx) => {
      out[`${vk}:${idx + 1}`] = word;
    });
  }
  return out;
}
