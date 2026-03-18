# Changelog

All notable changes to Tidefly UI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Discord, Slack & Email notification settings UI with test buttons per channel
- Webhook management — create, list, update, delete per project
- 2-step webhook creation dialog with provider-specific setup guides
- Webhook delivery history with status, commit, branch, duration, error details
- Version displayed in sidebar footer and About settings page
- Sidebar restructure — Webhooks under Source group alongside Git Integrations

### Changed
- Removed Vite dev proxy — all requests go directly to `VITE_API_URL`
- All raw `fetch('/api/...')` calls replaced with central `api` client from `$lib/api`
- SSE stores use `${import.meta.env.VITE_API_URL}` prefix

---

## [0.0.1-alpha] - TBD

> First internal alpha. Core container management UI, deployment wizards, monitoring dashboards.

### Added
- Initial SvelteKit + Svelte 5 Runes project setup
- Container management — list, start, stop, restart, remove
- Dockerfile and Docker Compose deployment wizards
- Project-based navigation and container isolation UI
- Real-time container metrics with historical charts (SSE)
- System monitoring dashboard with alert thresholds
- Interactive terminal (WebSocket + xterm.js)
- Container resource limits UI
- Port conflict detection (`PortInput` component)
- Git integration wizard (GitHub, GitLab, Gitea/Forgejo, Bitbucket)
- RBAC — admin and member role UI
- User management page
- Admin settings page (system, SMTP, S3, notifications)
- TanStack Query migration for all server state
- shadcn-svelte component library

---

## Roadmap

### Next Up
- [ ] In-app update notifications
- [ ] Custom domain management UI
- [ ] Deployment Templates marketplace

### Later
- [ ] Two-factor authentication UI
- [ ] SSO / LDAP login UI (Enterprise)

---

[Unreleased]: https://github.com/tidefly-oss/tidefly-ui/compare/v0.0.1-alpha...HEAD
[0.0.1-alpha]: https://github.com/tidefly-oss/tidefly-ui/releases/tag/v0.0.1-alpha