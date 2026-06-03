// Downloads Uthmani verse text + a curated set of translations from the
// Quran.com API and bundles them as static JSON for offline use.
//
//   public/data/verses.json          -> { "1:1": "بِسْمِ ...", ... }  (6236)
//   public/data/translations/<id>.json -> { "1:1": "translation", ... }
//
// Run with:  node scripts/download-translations.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");
const TR_DIR = join(DATA_DIR, "translations");

const API = "https://api.quran.com/api/v4";

// Translation resource ids we bundle. Keep in sync with src/lib/translations.ts.
const TRANSLATIONS = [
  { id: 87, label: "Amharic (Sadiq & Sani)" },
  { id: 111, label: "Afaan Oromo (Ghali)" },
  { id: 46, label: "Somali (Abduh)" },
  { id: 20, label: "English (Saheeh International)" },
  { id: 57, label: "Transliteration" },
];

// Strip HTML (footnote <sup> markers etc.) and tidy whitespace.
function clean(text) {
  return String(text ?? "")
    .replace(/<sup[^>]*>.*?<\/sup>/gis, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  await mkdir(TR_DIR, { recursive: true });

  // 1. Uthmani verses — gives the canonical verse-key order for everything else.
  console.log("Fetching Uthmani verses…");
  const versesData = await getJSON(`${API}/quran/verses/uthmani`);
  const verses = versesData.verses ?? [];
  if (verses.length !== 6236) {
    throw new Error(`Expected 6236 verses, got ${verses.length}`);
  }
  const order = verses.map((v) => v.verse_key);
  const versesOut = {};
  for (const v of verses) versesOut[v.verse_key] = v.text_uthmani;
  await writeFile(join(DATA_DIR, "verses.json"), JSON.stringify(versesOut));
  console.log(`  ✓ verses.json (${order.length} keys)`);

  // 2. Each translation, mapped onto the verse-key order.
  for (const t of TRANSLATIONS) {
    console.log(`Fetching translation ${t.id} — ${t.label}…`);
    const data = await getJSON(`${API}/quran/translations/${t.id}`);
    const items = data.translations ?? [];
    if (items.length !== order.length) {
      throw new Error(
        `Translation ${t.id}: expected ${order.length}, got ${items.length}`
      );
    }
    const out = {};
    items.forEach((item, i) => {
      out[order[i]] = clean(item.text);
    });
    await writeFile(join(TR_DIR, `${t.id}.json`), JSON.stringify(out));
    console.log(`  ✓ translations/${t.id}.json (${Object.keys(out).length} keys)`);
    await new Promise((r) => setTimeout(r, 300)); // be polite
  }

  // 3. Tajweed-tagged text — kept verbatim (with <tajweed class=…> tags) for
  //    offline colour highlighting.
  console.log("Fetching uthmani_tajweed…");
  const tjData = await getJSON(`${API}/quran/verses/uthmani_tajweed`);
  const tjVerses = tjData.verses ?? [];
  if (tjVerses.length !== order.length) {
    throw new Error(`Tajweed: expected ${order.length}, got ${tjVerses.length}`);
  }
  const tjOut = {};
  for (const v of tjVerses) tjOut[v.verse_key] = v.text_uthmani_tajweed;
  await writeFile(join(DATA_DIR, "tajweed.json"), JSON.stringify(tjOut));
  console.log(`  ✓ tajweed.json (${Object.keys(tjOut).length} keys)`);

  console.log("Done.");
}

main().catch((err) => {
  console.error("Download failed:", err);
  process.exit(1);
});
