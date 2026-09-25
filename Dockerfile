# Chincol Artesanía: Next.js (standalone) + Prisma + SQLite.
# La base y las fotos subidas viven en /app/data (montar un volumen ahí).

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- Dependencias ----------
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# ---------- Compilación ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Los datos de contacto se incrustan en la página al compilar.
ARG NEXT_PUBLIC_WHATSAPP=""
ARG NEXT_PUBLIC_INSTAGRAM=""
ARG NEXT_PUBLIC_EMAIL=""
ARG NEXT_PUBLIC_ADDRESS=""
ARG NEXT_PUBLIC_HOURS=""
ENV NEXT_PUBLIC_WHATSAPP=$NEXT_PUBLIC_WHATSAPP \
    NEXT_PUBLIC_INSTAGRAM=$NEXT_PUBLIC_INSTAGRAM \
    NEXT_PUBLIC_EMAIL=$NEXT_PUBLIC_EMAIL \
    NEXT_PUBLIC_ADDRESS=$NEXT_PUBLIC_ADDRESS \
    NEXT_PUBLIC_HOURS=$NEXT_PUBLIC_HOURS
RUN npx prisma generate && npm run build
# Datos de ejemplo en un solo archivo JS, para no llevar tsx a producción.
RUN npx esbuild prisma/seed.ts --bundle --platform=node --format=cjs --external:@prisma/client --outfile=prisma/seed.js

# ---------- Imagen final ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/app/data/db/chincol.db

# CLI de Prisma solo para crear/actualizar las tablas al arrancar (misma versión que el proyecto).
RUN npm install -g prisma@6.19.3 && npm cache clean --force

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma/schema.prisma /app/prisma/seed.js ./prisma/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data/db /app/data/uploads && chown -R node:node /app/data \
  && chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
VOLUME ["/app/data"]
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
