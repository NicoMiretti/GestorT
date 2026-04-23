# GestorT — Dashboard de Curaduría de Tesis

Sistema web local para redactar tu tesis de forma artesanal usando un repo de GitHub
(donde OpenCode genera borradores) como fuente de verdad. Filosofía: **Andamio vs
Construcción Real**: vos curás párrafo a párrafo, decidís qué entra al manuscrito final.

## Arquitectura

- **Next.js 14 (App Router) + TypeScript + Tailwind**
- **simple-git** + git CLI del sistema (PAT en `.env.local`)
- **Estado local** en `data/estado.json` (no se pushea, son tus metadatos privados)
- **Repo clonado** en `data/repo/` (ignorado por git de este proyecto)
- **IDs de párrafo estables** (hash sha1 del contenido normalizado) → resisten reordenamientos

## Setup

### Opción A — Docker (recomendado, portable)

Un solo comando, en cualquier máquina con Docker:

```powershell
copy .env.example .env.local   # editá GITHUB_PAT y tu email
docker compose up -d --build
# → http://localhost:3030
```

Para ver logs / parar / reiniciar:

```powershell
docker compose logs -f
docker compose down            # para
docker compose up -d            # vuelve a levantar (datos preservados)
docker compose down -v          # para Y borra el volumen (resetea estado)
```

**Persistencia:** todo lo que vive en `/app/data` (clone del repo de tesis +
`estado.json`) se guarda en un volumen Docker llamado `gestort_gestort-data`.
Sobrevive reinicios y rebuilds. El contenedor incluye `git` y `pandoc`
preinstalados, así que el export funciona out-of-the-box.

### Opción B — Local (sin Docker)

```powershell
npm install
copy .env.example .env.local   # editá GITHUB_PAT y tu email
npm run dev                     # http://localhost:3030
```

## Flujo de trabajo

1. **Pull** desde el dashboard → trae lo último que generó OpenCode.
2. Entrá a un capítulo → vista de **3 columnas**:
   - **Andamio**: el borrador crudo de OpenCode (read-only, párrafo por párrafo).
   - **Construcción real**: tu redacción curada (textarea editable).
   - **Notas privadas + Estado**: tus dudas y el ciclo de estado del párrafo.
3. Por cada párrafo podés:
   - **✓ Aceptar tal cual** (copia el borrador a tu versión y marca como validado).
   - Editar y **Guardar borrador** (queda en `data/estado.json`).
   - **✓ Validar** (lo cierra para esa sección).
   - Cambiar estado: pendiente · borrador listo · en redacción · validado · cerrado · necesita revisión bibliográfica · discutir con director.
4. Cuando terminás un capítulo, **💾 Escribir manuscrito final**: genera/actualiza el `.md` en `tesis/final/`.
5. Volvés al dashboard y hacés **Commit + Push**.

## Features

- ✅ Vista 3 columnas con sync por párrafo
- ✅ Estados granulares por párrafo + estado por archivo
- ✅ Notas privadas (nunca van al repo)
- ✅ Conteo de palabras (borrador vs curado)
- ✅ Historial git por archivo
- ✅ Búsqueda full-text en todo el repo (`/buscar`)
- ✅ Editor BibTeX (`/bibliografia`)
- ✅ Export a `.docx`/`.pdf`/`.tex` vía pandoc

## Requisitos opcionales

- **Docker Desktop** (modo recomendado): https://www.docker.com/products/docker-desktop
- Si corrés local sin Docker:
  - Node.js 20+
  - Git en el PATH
  - **pandoc** para export → https://pandoc.org/installing.html
  - Para `.pdf` con pandoc: LaTeX (MiKTeX o TinyTeX en Windows)

## Estructura

```
GestorT/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── page.tsx        # Dashboard
│   │   ├── capitulo/[slug] # Vista 3 columnas
│   │   ├── buscar/         # Full-text search
│   │   ├── bibliografia/   # BibTeX editor
│   │   └── api/            # Routes: repo, file, estado, search, bibtex, export
│   └── lib/                # git, parrafos, estado, bibtex, search, export
├── data/
│   ├── repo/               # clone del repo de tesis
│   └── estado.json         # tu metadata de curaduría
└── .env.local
```

## Seguridad

- El PAT vive solo en `.env.local` (gitignored).
- `data/estado.json` y `data/repo/` están gitignored del proyecto.
- Las notas privadas nunca se serializan a archivos del repo de tesis.
