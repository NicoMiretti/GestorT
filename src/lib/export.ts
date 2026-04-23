import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { repoPath, ensureCloned, listMd, fileExists } from "./git";

export type ExportFormat = "docx" | "pdf" | "tex" | "html";
export type ExportSource = "final" | "capitulos";

async function pandocAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("pandoc", ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

async function pdflatexAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("pdflatex", ["--version"], { shell: true });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

/**
 * Reutiliza la lógica de build-pdf.sh del repo de tesis:
 * - metadata.yaml con formato APA (Times New Roman 12pt, doble espaciado, márgenes, etc.)
 * - pandoc + pdflatex como engine
 * - Capítulos ordenados por nombre (01-xxx, 02-xxx)
 * Para PDF/TEX usa metadata.yaml + pdflatex. Para DOCX usa pandoc plano con --toc.
 */
export async function exportFinal(
  format: ExportFormat,
  source: ExportSource = "final",
): Promise<{ ok: boolean; path?: string; error?: string }> {
  await ensureCloned();

  const srcDir = source === "final"
    ? (process.env.FINAL_DIR || "tesis/final")
    : (process.env.SOURCE_DIR || "tesis/capitulos");
  const files = await listMd(srcDir);
  if (!files.length) {
    return { ok: false, error: `No hay archivos .md en ${srcDir}. ${source === "final" ? "Validá secciones primero." : "Hacé Pull."}` };
  }
  if (!(await pandocAvailable())) {
    return { ok: false, error: "Pandoc no está instalado." };
  }

  const root = repoPath();
  const outDir = path.join(root, "tesis", "output");
  await fs.mkdir(outDir, { recursive: true });

  const suffix = source === "final" ? "final" : "borrador";
  const ext = format === "tex" ? "tex" : format;
  const outFile = path.join(outDir, `tesis-${suffix}.${ext}`);

  // Ordenar archivos numéricamente (01-, 02-, …)
  const sorted = files.sort();
  const inputs = sorted.map((f) => path.join(root, f));

  // Metadata APA (si existe en el repo)
  const metadataRel = "tesis/metadata.yaml";
  const metadataAbs = path.join(root, metadataRel);
  const hasMetadata = existsSync(metadataAbs);

  const args: string[] = [];

  if (format === "docx") {
    // Word: pandoc con TOC y numeración (como build-pdf.sh --word)
    if (hasMetadata) args.push(metadataAbs);
    args.push(...inputs, "-o", outFile, "--toc", "--number-sections");
  } else if (format === "pdf" || format === "tex") {
    // PDF/TEX: pandoc + pdflatex con metadata APA completa
    if (!(await pdflatexAvailable())) {
      return { ok: false, error: "pdflatex no está instalado. Necesitás texlive-latex-recommended, texlive-latex-extra, texlive-fonts-recommended, texlive-lang-spanish." };
    }
    if (hasMetadata) args.push(metadataAbs);
    args.push(
      ...inputs,
      "-o", outFile,
      "--pdf-engine=pdflatex",
      "--toc",
      "--number-sections",
      "-V", "colorlinks=true",
      "-V", "linkcolor=black",
      "-V", "urlcolor=blue",
      "-V", "toccolor=black",
    );
  } else {
    // HTML
    if (hasMetadata) args.push(metadataAbs);
    args.push(...inputs, "-s", "-o", outFile, "--toc", "--number-sections");
  }

  return new Promise((resolve) => {
    const p = spawn("pandoc", args, { shell: true, cwd: root });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("exit", (code) => {
      if (code === 0 && existsSync(outFile)) {
        resolve({ ok: true, path: `tesis/output/tesis-${suffix}.${ext}` });
      } else {
        resolve({ ok: false, error: stderr || `pandoc exit ${code}` });
      }
    });
  });
}
