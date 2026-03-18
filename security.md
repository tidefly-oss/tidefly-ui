# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅         |

During the alpha/beta phase, only the latest release receives security fixes.

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities via GitHub Issues.**

Report vulnerabilities responsibly via [GitHub Private Security Advisories](https://github.com/tidefly-oss/tidefly-ui/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

### What to Expect

- **Acknowledgement** within 48 hours
- **Status update** within 7 days
- **Fix timeline** communicated as soon as assessed
- **Credit** in the release notes (if desired)

## Scope

**In scope:**

- XSS vulnerabilities
- CSRF issues
- Sensitive data exposure in the frontend
- Authentication/session handling issues
- Insecure API communication

**Out of scope:**

- Vulnerabilities in self-hosted infrastructure (your own servers)
- Social engineering attacks
- Denial of service without demonstrated impact