# =============================================================================
# Build Stage
# =============================================================================
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

COPY . .
ARG VERSION=dev
ENV PUBLIC_VERSION=${VERSION}
RUN npm run build

# =============================================================================
# Runtime Stage
# =============================================================================
FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

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
CMD ["node", "build"]