# Contributing to Tidefly UI

Thanks for your interest in contributing!

## Getting Started

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- A running [tidefly-plane](https://github.com/tidefly-oss/tidefly-plane) instance

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
pnpm dev          # start dev server (with Vite proxy to backend)
pnpm check        # TypeScript type check
pnpm lint         # run ESLint
pnpm build        # production build
```

## Project Structure
```
src/
  lib/
    api/          API client + per-domain modules
    components/   shared UI components (shadcn-svelte)
    queries/      TanStack Query factories
    stores/       Svelte 5 Rune stores
  routes/         SvelteKit file-based routing
static/           static assets
```

## Code Style

- Svelte 5 Runes only — no legacy `$:` reactive statements
- All API calls go through `$lib/api` — no raw `fetch` in components
- TanStack Query for all server state — no stores for remote data
- TypeScript strict mode

## Pull Requests

- Branch from `develop`, not `main`
- Keep PRs focused — one feature or fix per PR
- Update `changelog.md` under `[Unreleased]`

## Reporting Security Issues

Please do **not** open a public issue for security vulnerabilities.
Use [GitHub Private Security Advisories](https://github.com/tidefly-oss/tidefly-ui/security/advisories/new) instead.

---

<div align="center">

Built with ❤️ · [AGPLv3](https://github.com/tidefly-oss/tidefly-plane/blob/main/LICENSE) · [Report a vulnerability](https://github.com/tidefly-oss/tidefly-plane/security/advisories/new)

</div>