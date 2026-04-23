import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  EstadoStore, FileMeta, ParrafoMeta, EstadoParrafo,
} from "./estado-types";

export * from "./estado-types";

const FILE = path.join(process.cwd(), "data", "estado.json");

async function ensureFile(): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  if (!existsSync(FILE)) {
    const empty: EstadoStore = { archivos: {}, updatedAt: new Date().toISOString() };
    await fs.writeFile(FILE, JSON.stringify(empty, null, 2));
  }
}

export async function loadEstado(): Promise<EstadoStore> {
  await ensureFile();
  const raw = await fs.readFile(FILE, "utf8");
  return JSON.parse(raw);
}

export async function saveEstado(s: EstadoStore): Promise<void> {
  s.updatedAt = new Date().toISOString();
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}

export async function getFileMeta(file: string): Promise<FileMeta> {
  const s = await loadEstado();
  return s.archivos[file] || { parrafos: {} };
}

export async function setParrafoMeta(
  file: string,
  parrafoId: string,
  patch: Partial<ParrafoMeta>
): Promise<ParrafoMeta> {
  const s = await loadEstado();
  if (!s.archivos[file]) s.archivos[file] = { parrafos: {} };
  const prev: ParrafoMeta = s.archivos[file].parrafos[parrafoId] || {
    estado: "pendiente",
    notas: "",
    updatedAt: new Date().toISOString(),
  };
  const next: ParrafoMeta = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  s.archivos[file].parrafos[parrafoId] = next;
  await saveEstado(s);
  return next;
}

export async function setFileMeta(file: string, patch: Partial<FileMeta>): Promise<FileMeta> {
  const s = await loadEstado();
  const cur = s.archivos[file] || { parrafos: {} };
  const next = { ...cur, ...patch };
  s.archivos[file] = next;
  await saveEstado(s);
  return next;
}

export function statsForFile(meta: FileMeta) {
  const total = Object.keys(meta.parrafos).length;
  const counts: Record<EstadoParrafo, number> = {
    pendiente: 0, borrador_listo: 0, en_redaccion: 0, validado: 0,
    cerrado: 0, revisar_bibliografia: 0, discutir_director: 0,
  };
  for (const id in meta.parrafos) counts[meta.parrafos[id].estado]++;
  const completos = counts.validado + counts.cerrado;
  return { total, counts, progreso: total ? Math.round((completos / total) * 100) : 0 };
}
