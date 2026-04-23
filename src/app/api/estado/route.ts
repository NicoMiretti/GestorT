import { NextRequest, NextResponse } from "next/server";
import { setParrafoMeta, setFileMeta } from "@/lib/estado";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { file, parrafoId, patch, fileLevel } = body;
    if (!file) return NextResponse.json({ error: "file requerido" }, { status: 400 });
    if (fileLevel) {
      const m = await setFileMeta(file, patch || {});
      return NextResponse.json({ ok: true, meta: m });
    }
    if (!parrafoId) return NextResponse.json({ error: "parrafoId requerido" }, { status: 400 });
    const m = await setParrafoMeta(file, parrafoId, patch || {});
    return NextResponse.json({ ok: true, meta: m });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
