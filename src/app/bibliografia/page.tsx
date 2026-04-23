"use client";
import { useEffect, useState } from "react";

type BibEntry = { type: string; key: string; fields: Record<string, string>; raw: string };

const COMMON_FIELDS = ["author", "title", "year", "journal", "publisher", "url", "doi", "pages", "volume", "number", "booktitle", "editor", "address", "note"];

export default function BibPage() {
  const [entries, setEntries] = useState<BibEntry[]>([]);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  async function load() {
    const r = await fetch("/api/bibtex", { cache: "no-store" });
    const j = await r.json();
    setEntries(j.entries || []);
    setPath(j.path || "");
  }
  useEffect(() => { load(); }, []);

  function update(i: number, fn: (e: BibEntry) => BibEntry) {
    setEntries((es) => es.map((e, idx) => (idx === i ? fn(e) : e)));
  }

  function add() {
    setEntries((es) => [
      { type: "article", key: `nuevo${Date.now()}`, fields: { title: "", author: "", year: "" }, raw: "" },
      ...es,
    ]);
  }

  function remove(i: number) {
    setEntries((es) => es.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      const r = await fetch("/api/bibtex", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!r.ok) alert((await r.json()).error || "Error");
      else alert(`Guardado en ${path}. Pulleá/pusheá desde el dashboard.`);
    } finally { setBusy(false); }
  }

  const filtered = entries.filter((e) =>
    !filter ||
    e.key.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(e.fields).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="card p-3 flex gap-2 items-center">
        <input className="input" placeholder="Filtrar por key/título/autor…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn" onClick={add}>+ Nueva entrada</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar .bib"}</button>
        <span className="text-xs text-muted ml-auto font-mono">{path}</span>
      </div>
      <div className="space-y-2">
        {filtered.map((e, idx) => {
          const i = entries.indexOf(e);
          return (
            <div key={i} className="card p-3">
              <div className="flex gap-2 items-center mb-2">
                <select className="select !w-32" value={e.type} onChange={(ev) => update(i, (x) => ({ ...x, type: ev.target.value }))}>
                  {["article","book","inproceedings","techreport","misc","phdthesis","mastersthesis","online"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className="input !w-64 font-mono" value={e.key} onChange={(ev) => update(i, (x) => ({ ...x, key: ev.target.value }))} placeholder="citation_key" />
                <button className="btn btn-danger ml-auto !py-0.5" onClick={() => remove(i)}>Eliminar</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_FIELDS.map((f) => (
                  <label key={f} className="text-xs text-muted">
                    {f}
                    <input
                      className="input mt-0.5"
                      value={e.fields[f] || ""}
                      onChange={(ev) => update(i, (x) => ({ ...x, fields: { ...x.fields, [f]: ev.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-muted text-sm">Sin entradas.</div>}
      </div>
    </div>
  );
}
