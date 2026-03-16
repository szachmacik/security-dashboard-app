# ─── Sentinel Security Dashboard Dockerfile ──────────────────────────────────
FROM node:22-alpine AS base
ARG CACHE_BUST=1773678481
RUN npm install -g pnpm
WORKDIR /app

# ─── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
# Copy patches dir required by pnpm patchedDependencies
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ─── Production ───────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Health check (required by Coolify / Traefik)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/health || exit 1

EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
