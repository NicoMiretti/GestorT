import { NextRequest, NextResponse } from "next/server";
import { exportFinal, ExportFormat } from "@/lib/export";

export async function POST(req: NextRequest) {
  try {
    const { format } = await req.json();
    const f = (format || "docx") as ExportFormat;
    const r = await exportFinal(f);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
