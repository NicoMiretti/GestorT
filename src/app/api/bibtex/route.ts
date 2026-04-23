import { NextRequest, NextResponse } from "next/server";
import { fileExists, readRepoFile, writeRepoFile } from "@/lib/git";
import { parseBibtex, serializeBibtex } from "@/lib/bibtex";

export const dynamic = "force-dynamic";

function bibPath() {
  return process.env.BIBTEX_FILE || "fuentes/referencias.bib";
}

export async function GET() {
  try {
    const p = bibPath();
    if (!(await fileExists(p))) return NextResponse.json({ path: p, entries: [] });
    const raw = await readRepoFile(p);
    return NextResponse.json({ path: p, entries: parseBibtex(raw) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { entries } = await req.json();
    const p = bibPath();
    await writeRepoFile(p, serializeBibtex(entries || []));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
