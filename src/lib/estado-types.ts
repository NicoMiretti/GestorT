// Constantes y tipos compartidos cliente/servidor (sin imports de node:*)
export type EstadoParrafo =
  | "pendiente"
  | "borrador_listo"
  | "en_redaccion"
  | "validado"
  | "cerrado"
  | "revisar_bibliografia"
  | "discutir_director";

export const ESTADOS: { id: EstadoParrafo; label: string; color: string }[] = [
  { id: "pendiente", label: "Pendiente", color: "#8a929c" },
  { id: "borrador_listo", label: "Borrador OpenCode listo", color: "#7aa2f7" },
  { id: "en_redaccion", label: "En redacción", color: "#e0af68" },
  { id: "validado", label: "Validado", color: "#9ece6a" },
  { id: "cerrado", label: "Cerrado", color: "#73daca" },
  { id: "revisar_bibliografia", label: "Necesita revisión bibliográfica", color: "#bb9af7" },
  { id: "discutir_director", label: "Para discutir con director/a", color: "#f7768e" },
];

export type ParrafoMeta = {
  estado: EstadoParrafo;
  notas: string;
  finalText?: string;
  updatedAt: string;
};

export type FileMeta = {
  parrafos: Record<string, ParrafoMeta>;
  estadoArchivo?: EstadoParrafo;
  notasArchivo?: string;
};

export type EstadoStore = {
  archivos: Record<string, FileMeta>;
  updatedAt: string;
};
