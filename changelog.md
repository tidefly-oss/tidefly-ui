# Changelog

All notable changes to Tidefly UI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Authentication
- JWT-based auth with access token in memory and refresh token in HttpOnly cookie
- `tokenStore` — in-memory access token, never touches localStorage/sessionStorage
- Auto-refresh on 401 with singleton promise — prevents parallel refresh races
- `auth.init()` — restores session on app boot via refresh cookie
- Vite proxy configured for same-origin requests — fixes HttpOnly cookie in dev

#### Deploy — Caddy Expose
- Expose toggle on Dockerfile deploy wizard (Step 2) — clickable card UI
- Expose toggle on Compose deploy wizard — same card style
- Container port + optional custom domain fields when expose is enabled
- Public URLs shown in success step after expose deploy
- `withToken()` helper adds `?token=` to SSE/WebSocket URLs

#### Settings
- Proxy Domain section in General Settings — admin can change Control Plane base domain
- Clear warning: "This is the Control Plane domain only — Worker nodes manage their own routing"
- Registration Mode removed from UI — admin manages users directly

### Changed

#### Auth
- SSR disabled globally (`ssr = false`) — dashboard is fully client-side
- `hooks.server.ts` simplified — only checks for `tfy_rt` refresh cookie, no API calls
- Root `+layout.server.ts` removed — no server-side user loading
- Dashboard `+layout.svelte` uses `auth.init()` + `ready` flag — children not rendered until token is in memory
- Login form uses `goto()` for redirect instead of `window.location` — prevents page reload issues
- `app-sidebar.svelte` loads stores reactively on `auth.user` — fixes 401 race on dashboard load

#### API Client
- All auth endpoints use relative URLs (no `VITE_API_URL` prefix) — go through Vite proxy
- `system.info.svelte.ts` migrated from raw `fetch` to `systemApi.info()` — adds Bearer token
- `ResourceLimits.svelte` migrated from raw `fetch` to `containersApi.getResources/updateResources`
- `containersApi` extended with `getResources`, `updateResources`, `ResourceLimits` type export
- `logsUrl`, `statsUrl`, `dockerfileBuildUrl` use `withToken()` for SSE/WebSocket auth

#### Notifications / Events
- `events.svelte.ts` — connects only when `auth.user` is set, token in URL
- `notifications.svelte.ts` — token in SSE URL, no raw `VITE_API_URL`

### Fixed
- 401 on `/api/v1/system/info` — was using raw fetch without Bearer token
- 401 on resource limits GET/PATCH — raw fetch replaced with api client
- 401 on EventSource streams — `?token=` query param added
- 500 on WebSocket terminal — `echo.UnwrapResponse()` used to get hijackable ResponseWriter
- Dashboard refresh 500 — SSR disabled, all auth client-side
- Cookie not set in dev — `SameSite: Lax`, `Secure: false`, Vite proxy for same-origin
- Login redirect — `goto('/dashboard')` after successful auth.init()

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
- Admin settings page (system, SMTP, notifications)
- TanStack Query migration for all server state
- shadcn-svelte component library
- Discord, Slack & Email notification settings UI
- Webhook management per project
- Version displayed in sidebar footer and About settings page

---

## Roadmap

### Next Up
- [ ] Multi-node Worker UI
- [ ] Custom domain management UI
- [ ] In-app update notifications

### Later
- [ ] Two-factor authentication UI
- [ ] SSO / LDAP login UI (Enterprise)

---

[Unreleased]: https://github.com/tidefly-oss/tidefly-ui/compare/v0.0.1-alpha...HEAD
[0.0.1-alpha]: https://github.com/tidefly-oss/tidefly-ui/releases/tag/v0.0.1-alpha