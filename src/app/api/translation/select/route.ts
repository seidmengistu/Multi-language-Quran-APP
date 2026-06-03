import { NextResponse } from "next/server";
import { resolveTranslationId } from "@/lib/translations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = resolveTranslationId(body?.translationId);
    const res = NextResponse.json({ ok: true, translationId: id });
    res.cookies.set("translationId", String(id), {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
