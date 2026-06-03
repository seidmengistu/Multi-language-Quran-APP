/**
 * Canonical Qur'an reference data (Hafs / standard Madani 604-page mushaf).
 * Kept as static constants so list metadata never depends on parsing the
 * 4.6 MB page dataset at runtime.
 */

/** Number of ayāt per surah, indexed by surah id (1-based; index 0 unused). */
export const AYAH_COUNTS: number[] = [
  0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
  111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54,
  45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62,
  55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28,
  20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
  21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export function ayahCount(surahId: number): number {
  return AYAH_COUNTS[surahId] ?? 0;
}

export interface JuzInfo {
  juz: number;
  page: number; // start page in the Madani mushaf
  startSurahId: number;
  startAyah: number;
}

/** Start page + first verse of each of the 30 juz' (ajzā'). */
export const JUZ: JuzInfo[] = [
  { juz: 1, page: 1, startSurahId: 1, startAyah: 1 },
  { juz: 2, page: 22, startSurahId: 2, startAyah: 142 },
  { juz: 3, page: 42, startSurahId: 2, startAyah: 253 },
  { juz: 4, page: 62, startSurahId: 3, startAyah: 92 },
  { juz: 5, page: 82, startSurahId: 4, startAyah: 24 },
  { juz: 6, page: 102, startSurahId: 4, startAyah: 148 },
  { juz: 7, page: 121, startSurahId: 5, startAyah: 82 },
  { juz: 8, page: 142, startSurahId: 6, startAyah: 111 },
  { juz: 9, page: 162, startSurahId: 7, startAyah: 88 },
  { juz: 10, page: 182, startSurahId: 8, startAyah: 41 },
  { juz: 11, page: 201, startSurahId: 9, startAyah: 93 },
  { juz: 12, page: 222, startSurahId: 11, startAyah: 6 },
  { juz: 13, page: 242, startSurahId: 12, startAyah: 53 },
  { juz: 14, page: 262, startSurahId: 15, startAyah: 1 },
  { juz: 15, page: 282, startSurahId: 17, startAyah: 1 },
  { juz: 16, page: 302, startSurahId: 18, startAyah: 75 },
  { juz: 17, page: 322, startSurahId: 21, startAyah: 1 },
  { juz: 18, page: 342, startSurahId: 23, startAyah: 1 },
  { juz: 19, page: 362, startSurahId: 25, startAyah: 21 },
  { juz: 20, page: 382, startSurahId: 27, startAyah: 56 },
  { juz: 21, page: 402, startSurahId: 29, startAyah: 46 },
  { juz: 22, page: 422, startSurahId: 33, startAyah: 31 },
  { juz: 23, page: 442, startSurahId: 36, startAyah: 28 },
  { juz: 24, page: 462, startSurahId: 39, startAyah: 32 },
  { juz: 25, page: 482, startSurahId: 41, startAyah: 47 },
  { juz: 26, page: 502, startSurahId: 46, startAyah: 1 },
  { juz: 27, page: 522, startSurahId: 51, startAyah: 31 },
  { juz: 28, page: 542, startSurahId: 58, startAyah: 1 },
  { juz: 29, page: 562, startSurahId: 67, startAyah: 1 },
  { juz: 30, page: 582, startSurahId: 78, startAyah: 1 },
];

/** The juz' (1–30) that a given Madani page belongs to. */
export function juzForPage(page: number): number {
  let juz = 1;
  for (const j of JUZ) {
    if (page >= j.page) juz = j.juz;
    else break;
  }
  return juz;
}
