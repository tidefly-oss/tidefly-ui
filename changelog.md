# Changelog
All notable changes to Tidefly UI will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1-beta.1] - 2026-05-20

> First beta release. Service runtime state, drift detection, API docs toggle, and type system improvements.

### Added

#### Services
- `ServiceView` type with optional `runtime` and `drift` fields — merged desired + live state from backend
- Drift badge in services list when `drift.has_drift` is true
- Live runtime status resolution: uses `runtime.status` over DB status when available
- Replica count indicator in services list when more than 1 replica is running

#### Admin Settings
- API docs toggle in General Settings with danger badge warning about unauthenticated access

#### Load Testing
- Locust template support via `testing` category

### Fixed
- Live log stream: JWT token passed as query param for EventSource auth (browser limitation)
- `ContainerStatus` type: added missing `dead`, `restarting`, `unknown` states to status dot map
- `DeployWizard`: replaced all `any` types with proper `GitRepository`, `GitBranch`, and `ServiceCreateRequest` types
- `wsStore` emit: wrapped `forEach` callback to avoid implicit return value lint error
- Import ordering fixed across multiple files (Biome organizeImports)

### Changed
- `ServiceCreateRequest` extended with optional `worker_id` field

---

## [0.0.1-alpha.1] - 2026-03-31

> First public alpha. Core container management UI, deployment wizards, monitoring, and multi-node worker support.

### Added

#### Authentication
- JWT-based auth — access token in memory, refresh token in HttpOnly cookie
- Auto-refresh on 401 with singleton promise — prevents parallel refresh races
- `auth.init()` — restores session on app boot via refresh cookie
- SSR disabled globally — dashboard is fully client-side
- Vite proxy for same-origin requests in development — fixes HttpOnly cookie handling

#### Container Management
- Container list, start, stop, restart, delete
- Dockerfile and Docker Compose deployment wizards
- Project-based navigation and container isolation UI
- Real-time container logs and metrics via SSE
- Interactive terminal (WebSocket + xterm.js)
- Container resource limits UI
- Port conflict detection (`PortInput` component)

#### Multi-Node Worker UI
- Worker node list, revoke, delete
- Worker selection in all deploy wizards
- Container list per worker node
- Worker container log streaming

#### Monitoring
- System monitoring dashboard with CPU, memory, disk via SSE
- Alert thresholds and visual indicators
- Caddy access log streaming

#### Other
- Git integration wizard (GitHub, GitLab, Gitea/Forgejo, Bitbucket)
- Webhook management per project
- RBAC — admin and member role UI
- User management page
- Admin settings (system, SMTP, notifications, proxy domain)
- S3 backup configuration and Postgres export UI
- Notification center with SSE stream
- Version displayed in sidebar footer

---

## Roadmap

### Next (Beta)
- [ ] Custom domain management UI
- [ ] Two-factor authentication UI
- [ ] SSO / LDAP login UI (Enterprise)

### Done in Beta
- [x] Service runtime state and drift detection in UI
- [x] API docs toggle in admin settings
- [x] Full TypeScript type coverage in deploy wizard

---

[0.0.1-beta.1]: https://github.com/tidefly-oss/tidefly-ui/compare/v0.0.1-alpha.1...v0.0.1-beta.1
[0.0.1-alpha.1]: https://github.com/tidefly-oss/tidefly-ui/releases/tag/v0.0.1-alpha.1

<div align="center">
  Built with ❤️ by <a href="https://github.com/dbuettgen">@dbuettgen</a> · <a href="https://github.com/tidefly-oss/tidefly-plane/blob/main/LICENSE">AGPLv3</a> · <a href="https://github.com/tidefly-oss/tidefly-plane/security/advisories/new">Report a vulnerability</a>
</div>