import { NextResponse } from "next/server";
import { ensureCloned, listMd, status } from "@/lib/git";
import { loadEstado, statsForFile } from "@/lib/estado";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { cloned } = await ensureCloned();
    const sourceDir = process.env.SOURCE_DIR || "tesis/capitulos";
    const finalDir = process.env.FINAL_DIR || "tesis/final";
    const auxDir = process.env.AUX_DIR || "tesis/auxiliares";
    const notesDir = process.env.NOTES_DIR || "tesis/notas";
    const sourceFiles = await listMd(sourceDir);
    const finalFiles = await listMd(finalDir);
    const auxFiles = await listMd(auxDir);
    const noteFiles = await listMd(notesDir);
    const estado = await loadEstado();
    const st = await status();

    const archivos = sourceFiles.map((f) => {
      const meta = estado.archivos[f] || { parrafos: {} };
      return {
        path: f,
        ...statsForFile(meta),
        estadoArchivo: meta.estadoArchivo || "pendiente",
      };
    });

    const auxiliares = auxFiles.map((f) => {
      const meta = estado.archivos[f] || { parrafos: {} };
      return {
        path: f,
        estadoArchivo: meta.estadoArchivo || "pendiente",
        notasArchivo: meta.notasArchivo || "",
      };
    });

    return NextResponse.json({
      cloned,
      sourceDir,
      finalDir,
      auxDir,
      notesDir,
      archivos,
      finalFiles,
      auxiliares,
      noteFiles,
      git: {
        branch: st.current,
        ahead: st.ahead,
        behind: st.behind,
        modified: st.modified,
        not_added: st.not_added,
        staged: st.staged,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
