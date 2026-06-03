import { detectChaptersFromPage, PageWord } from "@/lib/quran-page-api";
import { fetchPageWords } from "@/lib/quran-page-fetch.server";
import { getSurahs } from "@/lib/surahs.server";
import { getTajweedForPage } from "@/lib/tajweed.server";
import { MushafPage } from "@/components/mushaf/MushafPage";

interface PageData {
  words: PageWord[];
  chapterIds: number[];
  chapterNames: Record<number, { english: string; arabic: string }>;
  tajweedWords: Record<string, string>;
}

async function loadPage(pageNumber: number): Promise<PageData | null> {
  try {
    // Text data only — audio is loaded client-side per reciter selection.
    const words = await fetchPageWords(pageNumber);
    const chapterIds = detectChaptersFromPage(words);

    // Real surah names so the reader header & surah bands are correct.
    const surahs = await getSurahs();
    const chapterNames: Record<number, { english: string; arabic: string }> = {};
    for (const id of chapterIds) {
      const s = surahs.find((x) => x.id === id);
      if (s) chapterNames[id] = { english: s.nameEnglish, arabic: s.nameArabic };
    }
    // Tajweed colour data bundled offline so the toggle works instantly.
    const tajweedWords = await getTajweedForPage(words);
    return { words, chapterIds, chapterNames, tajweedWords };
  } catch (err) {
    console.error("Failed to load Mushaf page:", err);
    return null;
  }
}

export default async function MushafPageRoute({
  params,
}: {
  params: Promise<{ pageNumber: string }>;
}) {
  const p = await params;
  const pageNumber = parseInt(p.pageNumber, 10) || 1;
  const data = await loadPage(pageNumber);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="p-16 text-center">
          <h1 className="mb-4 text-2xl font-bold text-destructive">
            Failed to load Qur&apos;an page {pageNumber}
          </h1>
          <p className="text-muted-foreground">
            Please check your connection and try again.
          </p>
        </div>
      </main>
    );
  }

  return (
    <MushafPage
      pageNumber={pageNumber}
      words={data.words}
      chapterIds={data.chapterIds}
      chapterNames={data.chapterNames}
      tajweedWords={data.tajweedWords}
    />
  );
}
