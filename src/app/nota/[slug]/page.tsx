"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type DocData = { file: string; exists: boolean; content: string };

export default function NotaPage({ params }: { params: { slug: string } }) {
  const file = decodeURIComponent(params.slug);
  const [data, setData] = useState<DocData | null>(null);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoSaved, setAutoSaved] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/doc?file=${encodeURIComponent(file)}`, { cache: "no-store" });
    const j = await r.json();
    setData(j);
    setContent(j.content || "");
  }
  useEffect(() => { load(); }, [file]);

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/doc", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file, content }),
      });
      if (!r.ok) alert((await r.json()).error);
      else setAutoSaved(new Date().toLocaleTimeString());
    } finally { setBusy(false); }
  }

  if (!data) return <div className="text-muted">Cargando…</div>;

  const wc = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <Link href="/" className="btn !py-1">← Dashboard</Link>
        <div>
          <div className="text-xs text-muted">Nota / Bitácora</div>
          <div className="font-mono text-sm">{file}</div>
        </div>
        <div>
          <div className="text-xs text-muted">Palabras</div>
          <div className="font-mono text-sm">{wc}</div>
        </div>
        {autoSaved && <div className="text-xs text-ok">Guardado {autoSaved}</div>}
        <div className="ml-auto">
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? "Guardando…" : "💾 Guardar"}
          </button>
        </div>
      </div>
      <div className="card p-3">
        <textarea
          className="textarea min-h-[80vh]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notas, ideas, bitácora de reuniones…"
        />
      </div>
    </div>
  );
}
