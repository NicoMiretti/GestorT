// Constantes y tipos compartidos cliente/servidor (sin imports de node:*)
export type EstadoParrafo =
  | "borrador_nuevo"       // OpenCode lo generó, aún no lo miraste
  | "borrador_modificado"  // OpenCode lo cambió desde que lo viste
  | "en_redaccion"         // estás trabajando en él
  | "validado"             // aceptado como final
  | "cerrado"              // intocable
  | "revisar_bibliografia"
  | "discutir_director";

export const ESTADOS: { id: EstadoParrafo; label: string; color: string; desc?: string }[] = [
  { id: "borrador_nuevo", label: "🆕 Borrador nuevo", color: "#7aa2f7", desc: "OpenCode lo generó, pendiente de revisión" },
  { id: "borrador_modificado", label: "⚠️ Modificado por OpenCode", color: "#e0af68", desc: "Cambió desde la última revisión" },
  { id: "en_redaccion", label: "✏️ En redacción", color: "#e0af68", desc: "Editándolo" },
  { id: "validado", label: "✅ Validado", color: "#9ece6a", desc: "Aceptado para el manuscrito final" },
  { id: "cerrado", label: "🔒 Cerrado", color: "#73daca", desc: "Intocable" },
  { id: "revisar_bibliografia", label: "📚 Revisar bibliografía", color: "#bb9af7" },
  { id: "discutir_director", label: "💬 Discutir con director/a", color: "#f7768e" },
];

export type ParrafoMeta = {
  estado: EstadoParrafo;
  notas: string;
  finalText?: string;       // texto curado (si difiere del borrador)
  updatedAt: string;
  lastSeenHash?: string;    // hash del último borrador "visto" (para detectar mods)
};

// Párrafos que ya no existen en el borrador actual pero tenían trabajo nuestro
export type ParrafoArchivado = ParrafoMeta & {
  id: string;
  archivedAt: string;
  lastRaw: string;
};

export type FileMeta = {
  parrafos: Record<string, ParrafoMeta>;
  archivados?: ParrafoArchivado[];
  estadoArchivo?: EstadoParrafo;
  notasArchivo?: string;
};

export type EstadoStore = {
  version: number;
  archivos: Record<string, FileMeta>;
  updatedAt: string;
};

export const ESTADO_VERSION = 2;
