"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ESTADOS } from "@/lib/estado-types";

type Parrafo = {
  id: string;
  index: number;
  type: string;
  level?: number;
  raw: string;
  text: string;
  wordCount: number;
  flags: string[];
};
type FileData = {
  file: string;
  finalPath: string;
  sourceMd: string;
  finalMd: string;
  sourceParrafos: Parrafo[];
  finalParrafos: Parrafo[];
  meta: { parrafos: Record<string, { estado: string; notas: string; finalText?: string; updatedAt: string }>; estadoArchivo?: string; notasArchivo?: string };
  history: { hash: string; date: string; message: string; author_name: string }[];
};

export default function CapituloPage({ params }: { params: { slug: string } }) {
  const file = decodeURIComponent(params.slug);
  const [data, setData] = useState<FileData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});  // texto curado en edición
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  async function load() {
    const r = await fetch(`/api/file?file=${encodeURIComponent(file)}`, { cache: "no-store" });
    const j = await r.json();
    setData(j);
    // Inicializar drafts y notes con lo que ya hay
    const dr: Record<string, string> = {};
    const nt: Record<string, string> = {};
    for (const p of j.sourceParrafos as Parrafo[]) {
      const meta = j.meta?.parrafos?.[p.id];
      dr[p.id] = meta?.finalText ?? p.raw;
      nt[p.id] = meta?.notas ?? "";
    }
    setDrafts(dr);
    setNotes(nt);
  }
  useEffect(() => { load(); }, [file]);

  const totalWords = useMemo(() => {
    if (!data) return { src: 0, draft: 0 };
    const src = data.sourceParrafos.reduce((a, p) => a + p.wordCount, 0);
    const draft = Object.values(drafts).reduce((a, t) => a + (t.trim() ? t.trim().split(/\s+/).length : 0), 0);
    return { src, draft };
  }, [data, drafts]);

  async function setEstado(parrafoId: string, estado: string) {
    await fetch("/api/estado", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file, parrafoId, patch: { estado } }),
    });
    await load();
  }

  async function saveParrafo(parrafoId: string) {
    setBusy(parrafoId);
    try {
      await fetch("/api/estado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file, parrafoId, patch: { finalText: drafts[parrafoId], notas: notes[parrafoId], estado: "en_redaccion" } }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function aceptarTalCual(p: Parrafo) {
    setBusy(p.id);
    try {
      setDrafts((d) => ({ ...d, [p.id]: p.raw }));
      await fetch("/api/estado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file, parrafoId: p.id, patch: { finalText: p.raw, estado: "validado" } }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function validar(parrafoId: string) {
    setBusy(parrafoId);
    try {
      await fetch("/api/estado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file, parrafoId, patch: { finalText: drafts[parrafoId], notas: notes[parrafoId], estado: "validado" } }),
      });
      await load();
    } finally { setBusy(null); }
  }

  async function escribirFinal() {
    if (!data) return;
    setBusy("write-final");
    try {
      // Construye el archivo final concatenando finalText de cada párrafo (o el original si no fue tocado)
      const lines: string[] = [];
      for (const p of data.sourceParrafos) {
        const meta = data.meta?.parrafos?.[p.id];
        const txt = meta?.finalText ?? drafts[p.id] ?? p.raw;
        if (txt.trim()) lines.push(txt);
      }
      const content = lines.join("\n\n").trim() + "\n";
      await fetch("/api/file", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: data.finalPath, content }),
      });
      alert(`Escrito: ${data.finalPath}\nUsá Pull/Push desde el dashboard para subirlo.`);
      await load();
    } finally { setBusy(null); }
  }

  if (!data) return <div className="text-muted">Cargando capítulo…</div>;

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="btn !py-1">← Dashboard</Link>
        <div>
          <div className="text-xs text-muted">Archivo</div>
          <div className="font-mono text-sm">{data.file}</div>
        </div>
        <div>
          <div className="text-xs text-muted">→ Final</div>
          <div className="font-mono text-sm">{data.finalPath}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Palabras</div>
          <div className="font-mono text-sm">borrador: {totalWords.src} · curado: {totalWords.draft}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="btn" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Ocultar historial" : "Historial git"}
          </button>
          <button className="btn btn-primary" disabled={!!busy} onClick={escribirFinal}>
            {busy === "write-final" ? "Escribiendo…" : "💾 Escribir manuscrito final"}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="card p-3">
          <h3 className="font-semibold mb-2 text-sm">Últimos commits sobre este archivo</h3>
          <ul className="text-xs font-mono space-y-1 max-h-60 overflow-auto scroll-thin">
            {data.history.map((h) => (
              <li key={h.hash} className="flex gap-3">
                <span className="text-muted">{h.hash.slice(0, 7)}</span>
                <span className="text-muted">{new Date(h.date).toLocaleString()}</span>
                <span className="text-accent">{h.author_name}</span>
                <span>{h.message}</span>
              </li>
            ))}
            {data.history.length === 0 && <li className="text-muted">Sin historial</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* Header de columnas */}
        <div className="col-span-4 text-xs uppercase tracking-wide text-muted px-1">Andamio (OpenCode)</div>
        <div className="col-span-5 text-xs uppercase tracking-wide text-muted px-1">Construcción real (Tu redacción)</div>
        <div className="col-span-3 text-xs uppercase tracking-wide text-muted px-1">Notas privadas + Estado</div>

        {data.sourceParrafos.map((p) => {
          const meta = data.meta?.parrafos?.[p.id];
          const estado = meta?.estado || "pendiente";
          const estadoCfg = ESTADOS.find((e) => e.id === estado)!;
          const draft = drafts[p.id] ?? p.raw;
          const changed = draft !== (meta?.finalText ?? p.raw) || (notes[p.id] ?? "") !== (meta?.notas ?? "");

          return (
            <div key={p.id} className="col-span-12 grid grid-cols-12 gap-3 group" id={`p-${p.id}`}>
              {/* Andamio */}
              <div className="col-span-4 card p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="kbd">{p.type}{p.level ? `·h${p.level}` : ""}</span>
                  <span className="text-xs text-muted">#{p.index} · {p.wordCount} palabras</span>
                  {p.flags.map((f) => (
                    <span key={f} className="badge text-warn border-warn/40">{f}</span>
                  ))}
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-muted">{p.raw}</pre>
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-ok !py-0.5" disabled={busy === p.id} onClick={() => aceptarTalCual(p)}>✓ Aceptar tal cual</button>
                </div>
              </div>

              {/* Construcción */}
              <div className="col-span-5 card p-3">
                <textarea
                  className="textarea min-h-[120px]"
                  rows={Math.max(4, p.raw.split("\n").length + 1)}
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                />
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <button className="btn !py-0.5" disabled={busy === p.id || !changed} onClick={() => saveParrafo(p.id)}>
                    {busy === p.id ? "Guardando…" : "Guardar borrador"}
                  </button>
                  <button className="btn btn-ok !py-0.5" disabled={busy === p.id} onClick={() => validar(p.id)}>✓ Validar</button>
                  <span className="text-xs text-muted ml-auto">
                    {draft.trim() ? draft.trim().split(/\s+/).length : 0} palabras
                  </span>
                </div>
              </div>

              {/* Notas + estado */}
              <div className="col-span-3 card p-3">
                <label className="text-xs text-muted">Estado</label>
                <select
                  className="select mt-1"
                  value={estado}
                  onChange={(e) => setEstado(p.id, e.target.value)}
                  style={{ borderColor: estadoCfg.color + "80", color: estadoCfg.color }}
                >
                  {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
                <label className="text-xs text-muted mt-3 block">Notas privadas (no se pushean)</label>
                <textarea
                  className="textarea mt-1 min-h-[80px]"
                  placeholder="Dudas, fuentes a chequear, ideas…"
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                  onBlur={() => fetch("/api/estado", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ file, parrafoId: p.id, patch: { notas: notes[p.id] || "" } }),
                  })}
                />
                {meta?.updatedAt && (
                  <div className="text-[10px] text-muted mt-2">Últ. cambio: {new Date(meta.updatedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
