import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { repoPath, ensureCloned, listMd } from "./git";

export type ExportFormat = "docx" | "pdf" | "tex" | "html";

async function pandocAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("pandoc", ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

export async function exportFinal(format: ExportFormat): Promise<{ ok: boolean; path?: string; error?: string }> {
  await ensureCloned();
  const finalDir = process.env.FINAL_DIR || "tesis/final";
  const files = await listMd(finalDir);
  if (!files.length) {
    return { ok: false, error: `No hay archivos .md en ${finalDir}. Validá secciones primero.` };
  }
  if (!(await pandocAvailable())) {
    return { ok: false, error: "Pandoc no está instalado. Instalá: https://pandoc.org/installing.html" };
  }

  const outDir = path.join(repoPath(), "tesis", "output");
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `tesis-final.${format === "tex" ? "tex" : format}`);
  const inputs = files.map((f) => path.join(repoPath(), f));

  return new Promise((resolve) => {
    const args = ["-s", "-o", outFile, ...inputs];
    const p = spawn("pandoc", args, { shell: true, cwd: repoPath() });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("exit", (code) => {
      if (code === 0 && existsSync(outFile)) resolve({ ok: true, path: outFile });
      else resolve({ ok: false, error: stderr || `pandoc exit ${code}` });
    });
  });
}
