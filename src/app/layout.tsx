import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gestor de Tesis",
  description: "Dashboard de curaduría sobre repo de OpenCode",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans">
        <header className="border-b border-border bg-panel/60 backdrop-blur sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center gap-4">
            <Link href="/" className="font-mono text-accent font-semibold">⌬ GestorT</Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link className="btn !py-1" href="/">Dashboard</Link>
              <Link className="btn !py-1" href="/buscar">Buscar</Link>
              <Link className="btn !py-1" href="/bibliografia">Bibliografía</Link>
            </nav>
            <div className="ml-auto text-xs text-muted">
              Curaduría artesanal · Andamio vs Construcción
            </div>
          </div>
        </header>
        <main className="max-w-[1600px] mx-auto px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
