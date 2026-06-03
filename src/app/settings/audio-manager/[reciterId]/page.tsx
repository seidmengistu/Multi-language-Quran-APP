import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSurahs } from "@/lib/surahs.server";
import { RECITERS } from "@/lib/reciters";
import { DownloadManager } from "@/components/audio/DownloadManager";

export default async function DownloadManagerPage({
  params,
}: {
  params: Promise<{ reciterId: string }>;
}) {
  const p = await params;
  const reciterId = Number(p.reciterId);
  const reciter = RECITERS.find((r) => r.id === reciterId);
  const surahs = await getSurahs();

  return (
    <div>
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-2">
          <Link
            href="/settings/audio-manager"
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="flex-1 truncate px-2 text-center text-lg font-bold">
            {reciter?.name ?? `Reciter ${reciterId}`}
          </h1>
          <span className="w-10" />
        </div>
      </header>

      <DownloadManager
        reciterId={reciterId}
        reciterName={reciter?.name ?? `Reciter ${reciterId}`}
        surahs={surahs}
      />
    </div>
  );
}
