import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Resolves a streamable recitation URL + word-timing segments for a
 * reciter/chapter straight from QuranCDN — no files written to disk, so it
 * works on serverless hosting (Vercel). The browser streams the returned
 * `audioUrl` directly from the CDN.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reciterId = Number(searchParams.get("reciterId"));
  const chapterId = Number(searchParams.get("chapterId"));

  if (!Number.isFinite(reciterId) || !Number.isFinite(chapterId)) {
    return NextResponse.json({ error: "Invalid reciterId/chapterId" }, { status: 400 });
  }

  const qdcUrl =
    `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files` +
    `?chapter=${chapterId}&segments=true`;

  try {
    const metaRes = await fetch(qdcUrl, { next: { revalidate: 86400 } });
    if (!metaRes.ok) {
      return NextResponse.json({ error: "Failed to fetch audio metadata" }, { status: 502 });
    }
    const meta = await metaRes.json();
    const audioFile = meta.audio_files?.[0];
    const audioUrl: string | undefined = audioFile?.audio_url;
    if (!audioUrl) {
      return NextResponse.json({ error: "No audio file for reciter/chapter" }, { status: 404 });
    }
    return NextResponse.json(
      { audioUrl, verse_timings: audioFile?.verse_timings ?? [] },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
