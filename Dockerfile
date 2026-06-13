# =============================================================================
# Build Stage
# =============================================================================
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=tidefly-ui-npm,target=/root/.npm \
    npm ci --prefer-offline

COPY . .

ARG VERSION=dev
ENV PUBLIC_VERSION=${VERSION}

RUN --mount=type=cache,id=tidefly-ui-vite,target=/app/node_modules/.vite \
    npm run build

# =============================================================================
# Runtime Stage
# =============================================================================
FROM node:24-alpine AS runtime
WORKDIR /app

# Only production deps — skips all devDependencies (~80% smaller node_modules)
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=tidefly-ui-npm,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --ignore-scripts

COPY --from=builder /app/build ./build

ARG VERSION=dev
LABEL org.opencontainers.image.title="tidefly-ui" \
      org.opencontainers.image.description="Tidefly Dashboard" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.source="https://github.com/tidefly-oss/tidefly-ui" \
      org.opencontainers.image.licenses="AGPL-3.0"

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "build"]