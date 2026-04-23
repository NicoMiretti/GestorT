import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  EstadoStore, FileMeta, ParrafoMeta, EstadoParrafo, ParrafoArchivado, ESTADO_VERSION,
} from "./estado-types";
import { repoPath, ensureCloned } from "./git";

export * from "./estado-types";

// Estado adentro del repo de tesis → se versiona y sincroniza entre PCs
function estadoFile(): string {
  return path.join(repoPath(), ".gestort", "estado.json");
}

// Path legacy (versiones anteriores guardaban acá)
const LEGACY_FILE = path.join(process.cwd(), "data", "estado.json");

async function ensureFile(): Promise<void> {
  await ensureCloned();
  const file = estadoFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  if (!existsSync(file)) {
    // Migrar desde legacy si existe
    if (existsSync(LEGACY_FILE)) {
      const raw = await fs.readFile(LEGACY_FILE, "utf8");
      try {
        const legacy = JSON.parse(raw);
        const migrated: EstadoStore = {
          version: ESTADO_VERSION,
          archivos: legacy.archivos || {},
          updatedAt: new Date().toISOString(),
        };
        await fs.writeFile(file, JSON.stringify(migrated, null, 2));
        return;
      } catch {
        /* ignorar, crear vacío */
      }
    }
    const empty: EstadoStore = {
      version: ESTADO_VERSION,
      archivos: {},
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(file, JSON.stringify(empty, null, 2));
  }
}

export async function loadEstado(): Promise<EstadoStore> {
  await ensureFile();
  const raw = await fs.readFile(estadoFile(), "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.version) parsed.version = ESTADO_VERSION;
  if (!parsed.archivos) parsed.archivos = {};
  return parsed;
}

export async function saveEstado(s: EstadoStore): Promise<void> {
  s.version = ESTADO_VERSION;
  s.updatedAt = new Date().toISOString();
  await fs.writeFile(estadoFile(), JSON.stringify(s, null, 2));
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
    estado: "borrador_nuevo",
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

/**
 * Reconcilia el estado con la lista actual de párrafos del borrador.
 * - Auto-crea metadata para párrafos nuevos (estado "borrador_nuevo").
 * - No toca párrafos preexistentes (mantiene su estado).
 * - Archiva párrafos que ya no existen pero tenían trabajo (notas/finalText).
 * - NO marca como "modificado" — el hash content-only ya hace que un párrafo cambiado
 *   aparezca como nuevo y el viejo se archive.
 */
export async function reconcileFile(
  file: string,
  parrafosActuales: { id: string; raw: string }[]
): Promise<{ nuevos: number; archivados: number; total: number }> {
  const s = await loadEstado();
  if (!s.archivos[file]) s.archivos[file] = { parrafos: {} };
  const meta = s.archivos[file];
  const idsActuales = new Set(parrafosActuales.map((p) => p.id));
  const idsPrevios = new Set(Object.keys(meta.parrafos));

  let nuevos = 0;
  let archivados = 0;
  const ahora = new Date().toISOString();

  // 1. Auto-crear metadata para párrafos nuevos
  for (const p of parrafosActuales) {
    if (!meta.parrafos[p.id]) {
      meta.parrafos[p.id] = {
        estado: "borrador_nuevo",
        notas: "",
        updatedAt: ahora,
        lastSeenHash: p.id,
      };
      nuevos++;
    }
  }

  // 2. Archivar párrafos desaparecidos que tenían trabajo (no descartar silenciosamente)
  if (!meta.archivados) meta.archivados = [];
  for (const id of Array.from(idsPrevios)) {
    if (!idsActuales.has(id)) {
      const m = meta.parrafos[id];
      const hadWork =
        (m.finalText && m.finalText.trim().length > 0) ||
        (m.notas && m.notas.trim().length > 0) ||
        ["validado", "cerrado", "en_redaccion", "revisar_bibliografia", "discutir_director"].includes(m.estado);
      if (hadWork) {
        const arch: ParrafoArchivado = {
          id,
          ...m,
          archivedAt: ahora,
          lastRaw: m.finalText || "",
        };
        meta.archivados.push(arch);
        archivados++;
      }
      delete meta.parrafos[id];
    }
  }

  await saveEstado(s);
  return { nuevos, archivados, total: parrafosActuales.length };
}

export function statsForFile(meta: FileMeta) {
  const total = Object.keys(meta.parrafos).length;
  const counts: Record<EstadoParrafo, number> = {
    borrador_nuevo: 0, borrador_modificado: 0, en_redaccion: 0,
    validado: 0, cerrado: 0, revisar_bibliografia: 0, discutir_director: 0,
  };
  for (const id in meta.parrafos) {
    const e = meta.parrafos[id].estado;
    if (counts[e] !== undefined) counts[e]++;
  }
  const completos = counts.validado + counts.cerrado;
  return {
    total,
    counts,
    progreso: total ? Math.round((completos / total) * 100) : 0,
    archivados: meta.archivados?.length || 0,
  };
}
