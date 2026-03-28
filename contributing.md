# Contributing to Tidefly UI

Thanks for your interest in contributing!

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- A running [tidefly-backend](https://github.com/tidefly-oss/tidefly-backend) instance

### Setup

```bash
git clone https://github.com/tidefly-oss/tidefly-ui
cd tidefly-ui

pnpm install
cp .env.example .env   # set VITE_API_URL
pnpm dev
```

## Development Workflow

```bash
pnpm dev          # start dev server
pnpm check        # TypeScript type check
pnpm lint         # run ESLint
pnpm build        # production build
```

## Project Structure

```
src/
  lib/
    api/          central API client
    components/   shared UI components (shadcn-svelte)
    stores/       Svelte stores
  routes/         SvelteKit file-based routing
static/           static assets
```

## Code Style

- Svelte 5 Runes only — no legacy `$:` reactive statements
- All API calls go through `$lib/api` — no raw `fetch` in components
- TanStack Query for all server state
- TypeScript strict mode

## Pull Requests

- Branch from `develop`, not `main`
- Keep PRs focused — one feature or fix per PR
- Update `changelog.md` under `[Unreleased]`

## Reporting Security Issues

Please do **not** open a public issue for security vulnerabilities.
Use [GitHub Private Security Advisories](https://github.com/tidefly-oss/tidefly-ui/security/advisories/new) instead.