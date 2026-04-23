import { NextRequest, NextResponse } from "next/server";
import { fileExists, readRepoFile, writeRepoFile, log } from "@/lib/git";
import { getFileMeta, setFileMeta } from "@/lib/estado";

export const dynamic = "force-dynamic";

function sanitize(rel: string): string {
  // Evita path traversal: nada de .. o paths absolutos
  const norm = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (norm.includes("..")) throw new Error("path inválido");
  if (!/\.(md|markdown|txt)$/i.test(norm)) throw new Error("solo .md/.markdown/.txt");
  return norm;
}

function allowedRoot(file: string): boolean {
  const aux = process.env.AUX_DIR || "tesis/auxiliares";
  const notes = process.env.NOTES_DIR || "tesis/notas";
  const source = process.env.SOURCE_DIR || "tesis/capitulos";
  const final = process.env.FINAL_DIR || "tesis/final";
  return [aux, notes, source, final].some((r) => file.startsWith(r + "/") || file === r);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const file = sanitize(url.searchParams.get("file") || "");
    if (!allowedRoot(file)) return NextResponse.json({ error: "fuera de raíz permitida" }, { status: 400 });
    const exists = await fileExists(file);
    const content = exists ? await readRepoFile(file) : "";
    const meta = await getFileMeta(file);
    const history = exists ? await log(file, 20).catch(() => []) : [];
    return NextResponse.json({ file, exists, content, meta, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { file, content, estadoArchivo, notasArchivo } = await req.json();
    const safe = sanitize(file);
    if (!allowedRoot(safe)) return NextResponse.json({ error: "fuera de raíz permitida" }, { status: 400 });
    if (typeof content !== "string") return NextResponse.json({ error: "content requerido" }, { status: 400 });
    await writeRepoFile(safe, content);
    const patch: any = {};
    if (estadoArchivo) patch.estadoArchivo = estadoArchivo;
    if (typeof notasArchivo === "string") patch.notasArchivo = notasArchivo;
    if (Object.keys(patch).length) await setFileMeta(safe, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Crear nuevo doc en raíz aux | notes
  try {
    const { kind, name } = await req.json();
    if (!["aux", "note"].includes(kind)) return NextResponse.json({ error: "kind inválido" }, { status: 400 });
    if (!name || !/^[\w\-. áéíóúñÁÉÍÓÚÑ]+$/.test(name)) {
      return NextResponse.json({ error: "nombre inválido (sin / ni ..)" }, { status: 400 });
    }
    const root = kind === "aux"
      ? (process.env.AUX_DIR || "tesis/auxiliares")
      : (process.env.NOTES_DIR || "tesis/notas");
    const fname = name.toLowerCase().endsWith(".md") ? name : `${name}.md`;
    const file = `${root}/${fname}`;
    if (await fileExists(file)) return NextResponse.json({ error: "ya existe" }, { status: 409 });
    const tpl = kind === "aux"
      ? `# ${name.replace(/\.md$/, "")}\n\n> Documento auxiliar de la tesis.\n\n## Objetivos\n\n- \n\n## Contenido\n\n`
      : `# ${name.replace(/\.md$/, "")}\n\n_${new Date().toLocaleString()}_\n\n`;
    await writeRepoFile(file, tpl);
    return NextResponse.json({ ok: true, file });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
