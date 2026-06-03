#!/usr/bin/env node

/**
 * One-time data download script.
 * Run once: `node scripts/download-data.mjs`
 *
 * Downloads:
 * 1. Quran Uthmani text (all 6236 ayahs) → public/data/quran.json
 * 2. Page-to-ayah mapping (604 pages) → public/data/pages.json  
 * 3. Word-level timing data for Alafasy → public/data/timings.json
 *
 * Sources:
 * - Text: api.alquran.cloud (one-time, result cached forever)
 * - Pages: api.quran.com (one-time)
 * - Timings: api.qurancdn.com (one-time)
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

async function fetchJSON(url) {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────
// 1. Download Quran Text
// ─────────────────────────────────────────────────────────────────────
async function downloadQuranText() {
  console.log("\n📖 Downloading Quran text...");
  const data = await fetchJSON(
    "https://api.alquran.cloud/v1/quran/quran-uthmani"
  );

  // Flatten into a simple structure: { "1:1": "بسم...", "1:2": "الحمد..." ... }
  const quran = {};
  const surahs = {};

  for (const surah of data.data.surahs) {
    surahs[surah.number] = {
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      numberOfAyahs: surah.numberOfAyahs,
      revelationType: surah.revelationType,
    };

    for (const ayah of surah.ayahs) {
      quran[`${surah.number}:${ayah.numberInSurah}`] = ayah.text;
    }
  }

  const output = { surahs, ayahs: quran };
  writeFileSync(join(DATA_DIR, "quran.json"), JSON.stringify(output));
  console.log(
    `  ✅ Saved ${Object.keys(quran).length} ayahs + ${Object.keys(surahs).length} surah metadata`
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2. Download Page-to-Ayah Mapping
// ─────────────────────────────────────────────────────────────────────
async function downloadPageMapping() {
  console.log("\n📄 Downloading page mapping (604 pages)...");

  const pages = {};

  // Fetch all 604 pages by getting the verses for each page
  // We'll do this efficiently by fetching all 114 surahs and mapping ayahs to pages
  const data = await fetchJSON(
    "https://api.quran.com/api/v4/quran/verses/uthmani?page_number=1"
  );

  // Actually, let's fetch page-by-page in batches
  // But that's 604 requests. Instead, let's use the words endpoint
  // to get page + line info for each word across ALL pages.
  //
  // More efficient: fetch by chapter and extract page info
  for (let ch = 1; ch <= 114; ch++) {
    if (ch % 10 === 0) console.log(`  ... chapter ${ch}/114`);

    const chData = await fetchJSON(
      `https://api.quran.com/api/v4/verses/by_chapter/${ch}?words=true&per_page=300&word_fields=line_number,text_uthmani,page_number`
    );

    for (const verse of chData.verses) {
      for (const word of verse.words) {
        const pg = word.page_number;
        if (!pages[pg]) {
          pages[pg] = { ayahs: [], words: [] };
        }

        // Track unique ayahs on this page
        if (
          !pages[pg].ayahs.includes(verse.verse_key)
        ) {
          pages[pg].ayahs.push(verse.verse_key);
        }

        // Store word data: position, line, text
        pages[pg].words.push({
          v: verse.verse_key,
          p: word.position,
          l: word.line_number,
          t: word.text_uthmani || word.text || "",
          c: word.char_type_name === "end" ? "e" : "w",
        });
      }
    }

    // Small delay to be respectful
    await new Promise((r) => setTimeout(r, 100));
  }

  writeFileSync(join(DATA_DIR, "pages.json"), JSON.stringify(pages));
  console.log(`  ✅ Saved ${Object.keys(pages).length} pages with word-level data`);
}

// ─────────────────────────────────────────────────────────────────────
// 3. Download Timing Data (Alafasy)
// ─────────────────────────────────────────────────────────────────────
async function downloadTimings() {
  console.log("\n🎵 Downloading word-level timing data (Alafasy)...");

  const allTimings = {};

  for (let ch = 1; ch <= 114; ch++) {
    if (ch % 10 === 0) console.log(`  ... chapter ${ch}/114`);

    const data = await fetchJSON(
      `https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter=${ch}&segments=true`
    );

    const audioFile = data.audio_files?.[0];
    if (!audioFile) continue;

    for (const vt of audioFile.verse_timings) {
      const segments = [];
      if (vt.segments) {
        for (const seg of vt.segments) {
          if (
            Array.isArray(seg) &&
            seg.length >= 3 &&
            typeof seg[1] === "number"
          ) {
            segments.push([seg[0], seg[1], seg[2]]);
            // [wordPosition, startMs, endMs]
          }
        }
      }

      allTimings[vt.verse_key] = {
        from: vt.timestamp_from,
        to: vt.timestamp_to,
        segments,
      };
    }

    // Small delay
    await new Promise((r) => setTimeout(r, 50));
  }

  // Also save per-chapter audio URLs
  const audioUrls = {};
  for (let ch = 1; ch <= 114; ch++) {
    const data = await fetchJSON(
      `https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter=${ch}`
    );
    if (data.audio_files?.[0]) {
      audioUrls[ch] = data.audio_files[0].audio_url;
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  const output = { timings: allTimings, audioUrls };
  writeFileSync(join(DATA_DIR, "timings.json"), JSON.stringify(output));
  console.log(`  ✅ Saved timings for ${Object.keys(allTimings).length} ayahs`);
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🕌 Quran Data Download Script");
  console.log("═══════════════════════════════════");
  console.log("This script downloads all data ONCE.");
  console.log("No external API calls will be made at runtime.\n");

  try {
    await downloadQuranText();
    await downloadPageMapping();
    await downloadTimings();

    console.log("\n═══════════════════════════════════");
    console.log("✅ All data downloaded successfully!");
    console.log("Files saved to: public/data/");
    console.log("  - quran.json (text)");
    console.log("  - pages.json (page layout + word positions)");
    console.log("  - timings.json (audio timing + URLs)");
    console.log("\nYou can now run the app with zero API dependencies.");
  } catch (err) {
    console.error("\n❌ Download failed:", err.message);
    process.exit(1);
  }
}

main();
