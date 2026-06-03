import { NextResponse } from "next/server";
import { DEFAULT_MUSHAF, MUSHAFS, type MushafId } from "@/lib/mushafs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mushafId = String(body?.mushafId ?? "") as MushafId;
    const ok = MUSHAFS.some((m) => m.id === mushafId);

    const res = NextResponse.json({ ok: true, mushafId: ok ? mushafId : DEFAULT_MUSHAF });
    res.cookies.set("mushafId", ok ? mushafId : DEFAULT_MUSHAF, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const res = NextResponse.json({ ok: false, error: message }, { status: 400 });
    res.cookies.set("mushafId", DEFAULT_MUSHAF, { path: "/", sameSite: "lax", httpOnly: false });
    return res;
  }
}

