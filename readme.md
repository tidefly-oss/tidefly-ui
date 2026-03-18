# Tidefly UI

> SvelteKit frontend for Tidefly — self-hosted container management platform.

This repository contains the SvelteKit frontend for Tidefly. It communicates with [tidefly-backend](https://github.com/tidefly-oss/tidefly-backend) via REST API and Server-Sent Events.

## Stack

- **SvelteKit** + Svelte 5 Runes
- **TanStack Query** — data fetching & caching
- **shadcn-svelte** — UI components
- **TypeScript**
- **pnpm**

## Repositories

| Repo                                                                  | Description                    |
|-----------------------------------------------------------------------|--------------------------------|
| [tidefly-backend](https://github.com/tidefly-oss/tidefly-backend)     | Go API + deployment engine     |
| [tidefly-ui](https://github.com/tidefly-oss/tidefly-ui)               | This repo — SvelteKit frontend |
| [tidefly-tui](https://github.com/tidefly-oss/tidefly-tui)             | Bubble Tea setup wizard        |
| [tidefly-templates](https://github.com/tidefly-oss/tidefly-templates) | Service deploy templates       |
| [tidefly-docs](https://github.com/tidefly-oss/tidefly-docs)           | Documentation                  |

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
cp .env.example .env   # set VITE_API_URL to your backend URL
pnpm dev
```

Frontend available at `http://localhost:5173`.

### Production Build

```bash
pnpm build
pnpm preview
```

The production image is built and published automatically on release via GitHub Actions.

## Environment Variables

| Variable       | Description         | Default                 |
|----------------|---------------------|-------------------------|
| `VITE_API_URL` | Tidefly backend URL | `http://localhost:8080` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## Security

Please do **not** open public issues for security vulnerabilities — use [GitHub Private Security Advisories](https://github.com/tidefly-oss/tidefly-ui/security/advisories/new) instead.

## License

[MIT](LICENSE)