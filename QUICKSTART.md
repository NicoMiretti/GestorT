# GestorT — Mini guía de levantado

Para correr el dashboard en cualquier PC (Windows / Mac / Linux) en menos de 5 minutos.

---

## Prerrequisitos

- **Docker Desktop** instalado y corriendo
  → https://www.docker.com/products/docker-desktop
- **Git** instalado (para clonar este repo)
  → https://git-scm.com/downloads
- Un **Personal Access Token (PAT)** de GitHub con scope `repo`
  → https://github.com/settings/tokens (botón *Generate new token (classic)*)

---

## Pasos (3 comandos)

```powershell
# 1. Clonar este repo
git clone https://github.com/NicoMiretti/GestorT.git
cd GestorT

# 2. Configurar entorno (Windows)
copy .env.example .env.local
#    En Mac/Linux: cp .env.example .env.local
#    Editá .env.local con tu editor:
#      - GITHUB_PAT=ghp_tu_token_real
#      - GIT_AUTHOR_NAME=Tu Nombre
#      - GIT_AUTHOR_EMAIL=tu-email@dominio.com
#      - REPO_URL=https://github.com/USUARIO/TU-REPO-DE-TESIS.git

# 3. Levantar
docker compose up -d --build
```

Abrir → **http://localhost:3030**

Al primer acceso el dashboard clona tu repo de tesis adentro del volumen
`gestort_gestort-data` (no se mezcla con este código). De ahí en más usás
los botones **Pull / Push** del header.

---

## Comandos útiles

```powershell
docker compose logs -f         # ver logs en vivo
docker compose ps              # ver estado del contenedor
docker compose restart         # reiniciar
docker compose down            # parar (mantiene datos)
docker compose up -d           # volver a levantar (datos preservados)
docker compose down -v         # parar Y borrar el volumen (RESET TOTAL)
docker compose build --no-cache # rebuild limpio si tocaste código
```

---

## Persistencia y portabilidad

| Qué | Dónde vive | Sobrevive `down`? | Sobrevive `down -v`? |
|---|---|---|---|
| Código del dashboard | imagen Docker | sí | sí |
| Clone de tu repo de tesis | volumen `gestort_gestort-data` | sí | **no** |
| `data/estado.json` (curaduría) | volumen `gestort_gestort-data` | sí | **no** |
| `.env.local` | tu filesystem (no entra a la imagen) | sí | sí |

**Para mover GestorT a otra PC manteniendo tu progreso:**

```powershell
# En la PC origen — exportar volumen
docker run --rm -v gestort_gestort-data:/data -v ${PWD}:/backup alpine `
  tar czf /backup/gestort-data.tgz -C /data .

# Copiar gestort-data.tgz + .env.local a la PC destino, después:
git clone https://github.com/NicoMiretti/GestorT.git
cd GestorT
docker compose up -d --build           # crea el volumen vacío
docker compose stop
docker run --rm -v gestort_gestort-data:/data -v ${PWD}:/backup alpine `
  tar xzf /backup/gestort-data.tgz -C /data
docker compose start
```

---

## Solución de problemas

**"Cannot connect to the Docker daemon"**
→ Docker Desktop no está corriendo. Abrilo y esperá a que arranque.

**El puerto 3030 está ocupado**
→ Editá `docker-compose.yml`, línea `ports: - "3030:3030"` y cambiá el primero
   (ej: `"3131:3030"`) — accedés en http://localhost:3131.

**Push falla con 403 / authentication**
→ Tu PAT venció o no tiene scope `repo`. Generá uno nuevo y actualizá `.env.local`,
   después: `docker compose restart`.

**No veo capítulos en el dashboard**
→ Verificá que tu repo de tesis tenga archivos `.md` dentro de la carpeta indicada
   en `SOURCE_DIR` (default: `tesis/capitulos`). Hacé **Pull** desde el header.

**Quiero resetear todo y empezar de cero**
→ `docker compose down -v` (borra el volumen, no el código).
