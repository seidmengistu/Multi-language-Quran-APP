import { getSurahIndex } from "@/lib/surahs.server";
import { JUZ } from "@/lib/quran-meta";
import { SurahBrowser } from "@/components/home/SurahBrowser";

type Tab = "surah" | "juz" | "bookmark";

export default async function SurasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const surahs = await getSurahIndex();
  const { tab } = await searchParams;
  const initialTab: Tab =
    tab === "juz" || tab === "bookmark" ? tab : "surah";
  return <SurahBrowser surahs={surahs} juz={JUZ} initialTab={initialTab} />;
}
