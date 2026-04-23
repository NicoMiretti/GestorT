import { NextRequest, NextResponse } from "next/server";
import { exportFinal, ExportFormat, ExportSource } from "@/lib/export";

export async function POST(req: NextRequest) {
  try {
    const { format, source } = await req.json();
    const f = (format || "pdf") as ExportFormat;
    const s = (source || "final") as ExportSource;
    const r = await exportFinal(f, s);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
