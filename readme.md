<p align="center">
  <img src="https://raw.githubusercontent.com/tidefly-oss/.github/main/assets/tidefly_mascot.svg" width="320" alt="Tidefly" />
</p>

<p align="center">
  <strong>SvelteKit frontend for Tidefly — self-hosted container management platform.</strong>
</p>

<p align="center">
  <a href="https://github.com/tidefly-oss/tidefly-ui/releases"><img src="https://img.shields.io/github/v/release/tidefly-oss/tidefly-ui?include_prereleases&label=version&color=7c3aed" alt="Version" /></a>
  <a href="https://github.com/tidefly-oss/tidefly-ui/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-06b6d4" alt="License" /></a>
  <a href="https://github.com/tidefly-oss/tidefly-ui/actions"><img src="https://img.shields.io/github/actions/workflow/status/tidefly-oss/tidefly-ui/ci.yaml?branch=main&label=CI" alt="CI" /></a>
</p>

---

## Table of Contents

- [Stack](#stack)
- [Repositories](#repositories)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Stack

- **SvelteKit** + Svelte 5 Runes
- **TanStack Query** — data fetching & caching
- **shadcn-svelte** — UI components
- **Tailwind CSS v4**
- **TypeScript**
- **pnpm**

---

## Repositories

| Repo                                                                  | Description                                            |
|-----------------------------------------------------------------------|--------------------------------------------------------|
| [tidefly-plane](https://github.com/tidefly-oss/tidefly-plane)         | Go backend — API, deployment engine, worker management |
| [tidefly-agent](https://github.com/tidefly-oss/tidefly-agent)         | Worker agent — runs on remote nodes, connects via mTLS |
| [tidefly-ui](https://github.com/tidefly-oss/tidefly-ui)               | This repo — SvelteKit frontend                         |
| [tidefly-tui](https://github.com/tidefly-oss/tidefly-tui)             | Bubble Tea setup wizard                                |
| [tidefly-templates](https://github.com/tidefly-oss/tidefly-templates) | Service deploy templates                               |
| [tidefly-docs](https://github.com/tidefly-oss/tidefly-docs)           | Documentation (coming soon)                            |

---

## Getting Started

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- A running [tidefly-plane](https://github.com/tidefly-oss/tidefly-plane) instance

## License

AGPLv3 — see [LICENSE](LICENSE)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/dbuettgen">@dbuettgen</a> · Part of the <a href="https://github.com/tidefly-oss">tidefly-oss</a> project</sub>
</div>