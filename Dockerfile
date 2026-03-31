# =============================================================================
# Build Stage
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# pnpm aktivieren
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies cachen
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Source kopieren und bauen
COPY . .
RUN pnpm build

# =============================================================================
# Runtime Stage
# =============================================================================
FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Nur production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build output vom builder
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "build"]