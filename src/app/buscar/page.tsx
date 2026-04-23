"use client";
import { useState } from "react";
import Link from "next/link";

export default function BuscarPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ file: string; line: number; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      setHits(j.hits || []);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="card p-3 flex gap-2">
        <input className="input" autoFocus placeholder="Buscar en todo el repo (md, tex, bib)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
      </form>
      <div className="card p-3">
        <div className="text-sm text-muted mb-2">{hits.length} coincidencias</div>
        <ul className="space-y-1 text-sm">
          {hits.map((h, i) => (
            <li key={i} className="border-b border-border pb-1">
              <Link href={`/capitulo/${encodeURIComponent(h.file)}`} className="text-accent font-mono text-xs">
                {h.file}:{h.line}
              </Link>
              <div className="font-mono text-[13px] text-muted truncate">{h.preview}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
