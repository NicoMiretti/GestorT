import { NextRequest, NextResponse } from "next/server";
import { readRepoFile, writeRepoFile, fileExists, log } from "@/lib/git";
import { splitParrafos } from "@/lib/parrafos";
import { getFileMeta } from "@/lib/estado";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const file = url.searchParams.get("file");
    if (!file) return NextResponse.json({ error: "file requerido" }, { status: 400 });

    const sourceMd = (await fileExists(file)) ? await readRepoFile(file) : "";
    const sourceParrafos = splitParrafos(sourceMd);

    // Archivo final equivalente
    const sourceDir = process.env.SOURCE_DIR || "tesis/capitulos";
    const finalDir = process.env.FINAL_DIR || "tesis/final";
    const rel = file.startsWith(sourceDir + "/") ? file.slice(sourceDir.length + 1) : path.basename(file);
    const finalPath = path.posix.join(finalDir, rel);
    const finalMd = (await fileExists(finalPath)) ? await readRepoFile(finalPath) : "";
    const finalParrafos = splitParrafos(finalMd);

    const meta = await getFileMeta(file);
    const history = await log(file, 20).catch(() => []);

    return NextResponse.json({
      file,
      finalPath,
      sourceMd,
      finalMd,
      sourceParrafos,
      finalParrafos,
      meta,
      history,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { file, content } = await req.json();
    if (!file || typeof content !== "string") {
      return NextResponse.json({ error: "file y content requeridos" }, { status: 400 });
    }
    await writeRepoFile(file, content);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
