import { cookies } from "next/headers";
import { getVerse } from "@/lib/verses.server";
import { getSurahs } from "@/lib/surahs.server";
import { resolveTranslationId } from "@/lib/translations";
import { DashboardHome } from "@/components/home/DashboardHome";

// A pool of well-known, uplifting ayāt for the "Ayah of the day" card.
const DAILY_AYAHS = [
  "1:1", "2:255", "2:286", "94:5", "2:152", "13:28", "65:3", "3:8",
  "2:186", "55:13", "2:153", "16:97", "39:53", "94:6", "2:201",
  "20:114", "25:74", "3:185", "50:16", "2:45", "3:139", "8:46",
];

function pickAyahKey(): string {
  // Random each time the home screen opens (this page renders dynamically).
  return DAILY_AYAHS[Math.floor(Math.random() * DAILY_AYAHS.length)];
}

export default async function HomePage() {
  const c = await cookies();
  const translationId = resolveTranslationId(c.get("translationId")?.value);
  const key = pickAyahKey();
  const [verse, surahs] = await Promise.all([
    getVerse(key, translationId),
    getSurahs(),
  ]);
  const surahId = Number(key.split(":")[0]);
  const surahName = surahs.find((s) => s.id === surahId)?.nameEnglish ?? "";

  return (
    <DashboardHome
      daily={verse ? { ...verse, surahId, surahName } : null}
    />
  );
}
