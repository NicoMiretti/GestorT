"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ESTADOS } from "@/lib/estado-types";

type DocData = {
  file: string;
  exists: boolean;
  content: string;
  meta: { estadoArchivo?: string; notasArchivo?: string };
  history: { hash: string; date: string; message: string; author_name: string }[];
};

export default function DocPage({ params }: { params: { slug: string } }) {
  const file = decodeURIComponent(params.slug);
  const [data, setData] = useState<DocData | null>(null);
  const [content, setContent] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/doc?file=${encodeURIComponent(file)}`, { cache: "no-store" });
    const j = await r.json();
    setData(j);
    setContent(j.content || "");
    setNotas(j.meta?.notasArchivo || "");
    setEstado(j.meta?.estadoArchivo || "pendiente");
  }
  useEffect(() => { load(); }, [file]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/doc", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file, content, estadoArchivo: estado, notasArchivo: notas }),
      });
      const j = await r.json();
      if (!r.ok) alert(j.error);
      await load();
    } finally { setBusy(false); }
  }

  if (!data) return <div className="text-muted">Cargando…</div>;

  const wc = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estadoCfg = ESTADOS.find((e) => e.id === estado)!;

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="btn !py-1">← Dashboard</Link>
        <div>
          <div className="text-xs text-muted">Documento auxiliar</div>
          <div className="font-mono text-sm">{file}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Palabras</div>
          <div className="font-mono text-sm">{wc}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="select !w-64"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            style={{ borderColor: estadoCfg.color + "80", color: estadoCfg.color }}
          >
            {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? "Guardando…" : "💾 Guardar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-9 card p-3">
          <textarea
            className="textarea min-h-[70vh]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribí el documento en Markdown…"
          />
        </div>
        <div className="col-span-3 card p-3">
          <label className="text-xs text-muted">Notas privadas (no se pushean)</label>
          <textarea
            className="textarea mt-1 min-h-[40vh]"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Dudas, recordatorios, ideas…"
          />
          {data.history.length > 0 && (
            <>
              <div className="text-xs text-muted mt-3 mb-1">Historial git</div>
              <ul className="text-[11px] font-mono space-y-1 max-h-40 overflow-auto scroll-thin">
                {data.history.map((h) => (
                  <li key={h.hash} className="text-muted">
                    <span className="text-accent">{h.hash.slice(0, 7)}</span> {h.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
