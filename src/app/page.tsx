"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Archivo = {
  path: string;
  total: number;
  progreso: number;
  counts: Record<string, number>;
  estadoArchivo: string;
};
type Auxiliar = { path: string; estadoArchivo: string; notasArchivo: string };
type Repo = {
  cloned: boolean;
  sourceDir: string;
  finalDir: string;
  auxDir: string;
  notesDir: string;
  archivos: Archivo[];
  finalFiles: string[];
  auxiliares: Auxiliar[];
  noteFiles: string[];
  git: { branch: string; ahead: number; behind: number; modified: string[]; not_added: string[]; staged: string[] };
};

export default function Dashboard() {
  const [data, setData] = useState<Repo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState("chore(tesis): avance manual de curaduría");

  async function load() {
    setErr(null);
    const r = await fetch("/api/repo", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) setErr(j.error); else setData(j);
  }

  useEffect(() => { load(); }, []);

  async function sync(action: "pull" | "push") {
    setBusy(action);
    try {
      const r = await fetch("/api/repo/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, message: pushMsg }),
      });
      const j = await r.json();
      if (!r.ok) alert(j.error || "Error");
      await load();
    } finally { setBusy(null); }
  }

  async function exportar(format: string) {
    setBusy("export");
    try {
      const r = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const j = await r.json();
      if (!r.ok) alert(j.error);
      else alert("Exportado a: " + j.path);
    } finally { setBusy(null); }
  }

  async function crearDoc(kind: "aux" | "note") {
    const name = prompt(kind === "aux"
      ? "Nombre del documento auxiliar (ej: objetivos, metodologia)"
      : "Nombre de la nota (ej: reunion-2026-04-23)");
    if (!name) return;
    setBusy("crear");
    try {
      const r = await fetch("/api/doc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, name }),
      });
      const j = await r.json();
      if (!r.ok) { alert(j.error); return; }
      const route = kind === "aux" ? "/doc/" : "/nota/";
      window.location.href = route + encodeURIComponent(j.file);
    } finally { setBusy(null); }
  }

  if (err) return <div className="card p-6 text-danger">Error: {err}<br/><span className="text-muted text-sm">Verificá .env.local (REPO_URL, GITHUB_PAT)</span></div>;
  if (!data) return <div className="text-muted">Cargando…</div>;

  const totalPalabras = 0; // placeholder agregado
  const dirty = data.git.modified.length + data.git.not_added.length + data.git.staged.length;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs text-muted">Branch</div>
            <div className="font-mono">{data.git.branch}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Ahead / Behind</div>
            <div className="font-mono">{data.git.ahead} / {data.git.behind}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Cambios sin commitear</div>
            <div className={dirty ? "text-warn font-mono" : "font-mono"}>{dirty}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn" disabled={!!busy} onClick={() => sync("pull")}>{busy === "pull" ? "Pulleando…" : "↓ Pull"}</button>
            <input className="input !w-80" value={pushMsg} onChange={(e) => setPushMsg(e.target.value)} placeholder="Mensaje de commit"/>
            <button className="btn btn-primary" disabled={!!busy} onClick={() => sync("push")}>{busy === "push" ? "Pusheando…" : "↑ Commit + Push"}</button>
          </div>
        </div>
        {dirty > 0 && (
          <div className="mt-3 text-xs text-muted">
            Modificados: {data.git.modified.join(", ") || "—"} · Nuevos: {data.git.not_added.join(", ") || "—"}
          </div>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Capítulos / Secciones <span className="text-muted text-sm">({data.sourceDir})</span></h2>
          <div className="flex gap-2">
            <button className="btn" disabled={!!busy} onClick={() => exportar("docx")}>Export .docx</button>
            <button className="btn" disabled={!!busy} onClick={() => exportar("pdf")}>Export .pdf</button>
            <button className="btn" disabled={!!busy} onClick={() => exportar("tex")}>Export .tex</button>
          </div>
        </div>
        {data.archivos.length === 0 ? (
          <div className="text-muted text-sm">No hay archivos .md en <code>{data.sourceDir}</code>. Pull el repo o ajustá <code>SOURCE_DIR</code>.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2">Archivo</th>
                <th>Párrafos</th>
                <th>Progreso</th>
                <th>Pendiente</th>
                <th>En redacción</th>
                <th>Validado</th>
                <th>Discutir</th>
                <th>Bibliografía</th>
              </tr>
            </thead>
            <tbody>
              {data.archivos.map((a) => (
                <tr key={a.path} className="border-t border-border hover:bg-[#1a1e25]/50">
                  <td className="py-2">
                    <Link href={`/capitulo/${encodeURIComponent(a.path)}`} className="text-accent hover:underline">
                      {a.path.replace(data.sourceDir + "/", "")}
                    </Link>
                  </td>
                  <td>{a.total}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-[#0e1115] rounded">
                        <div className="h-full bg-ok rounded" style={{ width: `${a.progreso}%` }} />
                      </div>
                      <span className="text-xs text-muted">{a.progreso}%</span>
                    </div>
                  </td>
                  <td>{a.counts.pendiente || 0}</td>
                  <td>{a.counts.en_redaccion || 0}</td>
                  <td className="text-ok">{a.counts.validado || 0}</td>
                  <td className="text-danger">{a.counts.discutir_director || 0}</td>
                  <td className="text-[#bb9af7]">{a.counts.revisar_bibliografia || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Documentos auxiliares <span className="text-muted text-sm">({data.auxDir})</span>
          </h2>
          <button className="btn" disabled={!!busy} onClick={() => crearDoc("aux")}>+ Nuevo auxiliar</button>
        </div>
        {data.auxiliares.length === 0 ? (
          <div className="text-muted text-sm">
            Sin documentos auxiliares. Acá van objetivos, metodología, propuesta, planificación…
          </div>
        ) : (
          <ul className="text-sm space-y-1">
            {data.auxiliares.map((a) => (
              <li key={a.path} className="flex items-center gap-3 border-b border-border py-1">
                <Link href={`/doc/${encodeURIComponent(a.path)}`} className="text-accent hover:underline font-mono">
                  {a.path.replace(data.auxDir + "/", "")}
                </Link>
                <span className="badge text-xs">{a.estadoArchivo}</span>
                {a.notasArchivo && <span className="text-xs text-muted truncate">📝 {a.notasArchivo.slice(0, 60)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Notas / Bitácora <span className="text-muted text-sm">({data.notesDir})</span>
          </h2>
          <button className="btn" disabled={!!busy} onClick={() => crearDoc("note")}>+ Nueva nota</button>
        </div>
        {data.noteFiles.length === 0 ? (
          <div className="text-muted text-sm">
            Sin notas. Útil para reuniones con el director, bitácora de decisiones, ideas sueltas…
          </div>
        ) : (
          <ul className="text-sm space-y-1">
            {data.noteFiles.map((f) => (
              <li key={f} className="font-mono">
                <Link href={`/nota/${encodeURIComponent(f)}`} className="text-accent hover:underline">
                  {f.replace(data.notesDir + "/", "")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h3 className="font-semibold mb-2">Manuscrito final ({data.finalDir})</h3>
        {data.finalFiles.length === 0 ? (
          <div className="text-muted text-sm">Aún no hay archivos curados. Empezá por un capítulo y validá secciones.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {data.finalFiles.map((f) => <li key={f} className="font-mono">{f}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
