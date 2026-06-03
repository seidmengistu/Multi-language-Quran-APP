import { cookies } from "next/headers";
import { getSurahs } from "@/lib/surahs.server";
import { getSurahVerses } from "@/lib/verses.server";
import { getSurahStartPages } from "@/lib/surah-start.server";
import { AYAH_COUNTS } from "@/lib/quran-meta";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslation,
  resolveTranslationId,
} from "@/lib/translations";
import { ReadingView } from "@/components/read/ReadingView";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ surahId: string }>;
}) {
  const { surahId: sidStr } = await params;
  const surahId = Math.min(114, Math.max(1, parseInt(sidStr, 10) || 1));

  const c = await cookies();
  const translationId = resolveTranslationId(c.get("translationId")?.value);
  const translation =
    getTranslation(translationId) ?? getTranslation(DEFAULT_TRANSLATION_ID)!;

  const [surahs, verses, startPages] = await Promise.all([
    getSurahs(),
    getSurahVerses(surahId, translationId),
    getSurahStartPages(),
  ]);
  const surah = surahs.find((s) => s.id === surahId);

  return (
    <ReadingView
      surahId={surahId}
      surahName={surah?.nameEnglish ?? `Surah ${surahId}`}
      surahTranslation={surah?.nameTranslation ?? ""}
      surahArabic={surah?.nameArabic ?? ""}
      revelation={surah?.revelationType ?? ""}
      ayahCount={AYAH_COUNTS[surahId] ?? verses.length}
      startPage={startPages[surahId] ?? 1}
      verses={verses}
      translation={translation}
    />
  );
}
