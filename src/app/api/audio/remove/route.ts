import { NextResponse } from "next/server";
import { rm } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reciterId = Number(body?.reciterId);
    const chapterId = body?.chapterId == null ? null : Number(body.chapterId);
    const removeAll = Boolean(body?.removeAll);

    if (!Number.isFinite(reciterId)) {
      return NextResponse.json({ error: "Invalid reciterId" }, { status: 400 });
    }

    if (removeAll) {
      const dir = join(process.cwd(), "public", "audio", String(reciterId));
      await rm(dir, { recursive: true, force: true });
      return NextResponse.json({ ok: true, removedAll: true });
    }

    if (chapterId == null || !Number.isFinite(chapterId)) {
      return NextResponse.json({ error: "Invalid chapterId" }, { status: 400 });
    }

    const file = join(
      process.cwd(),
      "public",
      "audio",
      String(reciterId),
      `${pad3(chapterId)}.mp3`
    );
    await rm(file, { force: true });
    return NextResponse.json({ ok: true, removedAll: false, chapterId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove audio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

