import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reciterId = Number(searchParams.get("reciterId"));
  if (!Number.isFinite(reciterId)) {
    return NextResponse.json({ error: "Invalid reciterId" }, { status: 400 });
  }

  const dir = join(process.cwd(), "public", "audio", String(reciterId));
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    files = [];
  }

  const downloaded: number[] = [];
  const sizes: Record<number, number> = {};
  let totalBytes = 0;

  for (const f of files) {
    const m = /^(\d{3})\.mp3$/.exec(f);
    if (!m) continue;
    const chapterId = Number(m[1]);
    downloaded.push(chapterId);
    try {
      const s = await stat(join(dir, f));
      totalBytes += s.size;
      sizes[chapterId] = s.size;
    } catch {
      // ignore
    }
  }

  downloaded.sort((a, b) => a - b);
  return NextResponse.json({ ok: true, reciterId, downloaded, sizes, totalBytes });
}

