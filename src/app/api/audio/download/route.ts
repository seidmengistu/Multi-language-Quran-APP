import { NextResponse } from "next/server";
import { mkdir, stat, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

async function fileExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download audio (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reciterId = Number(body?.reciterId);
    const chapterId = Number(body?.chapterId);

    if (!Number.isFinite(reciterId) || !Number.isFinite(chapterId)) {
      return NextResponse.json({ error: "Invalid reciterId/chapterId" }, { status: 400 });
    }

    const baseName = pad3(chapterId);
    const relMp3Path = `/audio/${reciterId}/${baseName}.mp3`;
    const relSegPath = `/audio/${reciterId}/${baseName}.segments.json`;
    const outMp3Path = join(process.cwd(), "public", relMp3Path);
    const outSegPath = join(process.cwd(), "public", relSegPath);
    const outDir = join(process.cwd(), "public", "audio", String(reciterId));
    await mkdir(outDir, { recursive: true });

    const mp3Exists = await fileExists(outMp3Path);
    const segExists = await fileExists(outSegPath);

    // Get canonical audio URL + per-reciter word timings from QuranCDN
    const qdcUrl =
      `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files` +
      `?chapter=${chapterId}&segments=true`;

    const metaRes = await fetch(qdcUrl);
    if (!metaRes.ok) {
      return NextResponse.json({ error: "Failed to fetch audio metadata" }, { status: 502 });
    }
    const meta = await metaRes.json();
    const audioFile = meta.audio_files?.[0];
    const remoteAudioUrl: string | undefined = audioFile?.audio_url;
    if (!remoteAudioUrl) {
      return NextResponse.json({ error: "No audio file found for reciter/chapter" }, { status: 404 });
    }

    if (!mp3Exists) {
      await downloadToFile(remoteAudioUrl, outMp3Path);
    }

    if (!segExists) {
      // Persist verse_timings exactly as returned (small + future-proof)
      const segPayload = { reciterId, chapterId, verse_timings: audioFile?.verse_timings ?? [] };
      await writeFile(outSegPath, Buffer.from(JSON.stringify(segPayload)));
    }

    return NextResponse.json({
      ok: true,
      audioUrl: relMp3Path,
      segmentsUrl: relSegPath,
      alreadyExists: mp3Exists && segExists,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to download audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

