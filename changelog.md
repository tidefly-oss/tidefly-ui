# Changelog

All notable changes to Tidefly UI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

---

[Unreleased]: https://github.com/tidefly-oss/tidefly-ui/compare/v0.0.1-alpha.1...HEAD
[0.0.1-alpha.1]: https://github.com/tidefly-oss/tidefly-ui/releases/tag/v0.0.1-alpha.1


<div align="center">

Built with ❤️ · [AGPLv3](https://github.com/tidefly-oss/tidefly-plane/blob/main/LICENSE) · [Report a vulnerability](https://github.com/tidefly-oss/tidefly-plane/security/advisories/new)

</div>