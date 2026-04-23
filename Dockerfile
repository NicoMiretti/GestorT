# ---------- Stage 1: deps ----------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: build ----------
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV HOSTNAME=0.0.0.0

# git: requerido por simple-git (clone/pull/push)
# pandoc: export a docx/pdf/tex
# texlive: pdflatex para PDF con formato APA (metadata.yaml del repo de tesis)
# openssh-client: por si usás SSH remotes
# ca-certificates: para TLS hacia github.com
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      git pandoc openssh-client ca-certificates \
      texlive-latex-recommended texlive-latex-extra \
      texlive-fonts-recommended texlive-lang-spanish \
 && rm -rf /var/lib/apt/lists/* \
 && git config --system --add safe.directory '*'

# Copiamos el build entero (no usamos standalone para mantener simple)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Carpeta de datos persistente (volumen)
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]

EXPOSE 3030
CMD ["npx", "next", "start", "-p", "3030", "-H", "0.0.0.0"]
