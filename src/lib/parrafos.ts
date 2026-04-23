import crypto from "node:crypto";

export type Parrafo = {
  id: string;          // hash estable basado en contenido normalizado
  index: number;       // orden en el documento
  type: "heading" | "paragraph" | "list" | "code" | "quote" | "table" | "blank";
  level?: number;      // para headings
  raw: string;         // texto crudo
  text: string;        // texto plano (sin markdown)
  wordCount: number;
  flags: string[];     // ej: ["INPUT_AUTOR", "REVISAR_FUENTE"]
};

const FLAG_RE = /\[(INPUT_AUTOR|REVISAR_FUENTE|TODO|DUDA)\]/g;

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function hashFor(text: string, idx: number): string {
  // Hash del contenido + posición → estable mientras no edites el párrafo
  const h = crypto.createHash("sha1");
  h.update(`${idx}::${normalize(text)}`);
  return h.digest("hex").slice(0, 12);
}

function classify(block: string): Parrafo["type"] {
  const t = block.trimStart();
  if (/^#{1,6}\s/.test(t)) return "heading";
  if (/^```/.test(t)) return "code";
  if (/^>\s/.test(t)) return "quote";
  if (/^\s*[-*+]\s/.test(t) || /^\s*\d+\.\s/.test(t)) return "list";
  if (/^\|.*\|/.test(t)) return "table";
  if (!t) return "blank";
  return "paragraph";
}

function stripMd(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>]/g, "")
    .trim();
}

export function splitParrafos(md: string): Parrafo[] {
  // Split por línea en blanco, preservando bloques de código
  const blocks: string[] = [];
  const lines = md.split(/\r?\n/);
  let buf: string[] = [];
  let inCode = false;
  const flush = () => {
    const b = buf.join("\n");
    if (b.length) blocks.push(b);
    buf = [];
  };
  for (const ln of lines) {
    if (ln.startsWith("```")) {
      inCode = !inCode;
      buf.push(ln);
      if (!inCode) flush();
      continue;
    }
    if (inCode) {
      buf.push(ln);
      continue;
    }
    if (ln.trim() === "") {
      flush();
    } else {
      buf.push(ln);
    }
  }
  flush();

  return blocks.map((raw, index) => {
    const text = stripMd(raw);
    const flags = Array.from(raw.matchAll(FLAG_RE)).map((m) => m[1]);
    return {
      id: hashFor(raw, index),
      index,
      type: classify(raw),
      level: classify(raw) === "heading" ? raw.match(/^#+/)?.[0].length : undefined,
      raw,
      text,
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
      flags,
    };
  });
}

export function joinParrafos(parrafos: { raw: string }[]): string {
  return parrafos.map((p) => p.raw).join("\n\n").trim() + "\n";
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
