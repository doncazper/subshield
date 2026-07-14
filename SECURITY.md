# Security Policy

## Reporting a vulnerability

Please do not open a public issue for vulnerabilities, OAuth codes, access tokens, client secrets, cookies, or private user information.

Use GitHub’s private vulnerability reporting flow:

`https://github.com/doncazper/subshield/security/advisories/new`

Include a concise description, affected route or component, reproduction steps, and impact. Do not include live Reddit credentials. Maintainers will acknowledge reports as soon as practical and coordinate remediation before disclosure.

## Security design

- OAuth authorization codes are exchanged only by the Worker.
- The OAuth `state` value is cryptographically random, encrypted in a short-lived cookie, and verified with a constant-time comparison.
- Access tokens use temporary authorization only and are encrypted with AES-GCM in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
- Mutation endpoints require a same-origin request.
- Production credentials must be Cloudflare secrets and must never appear in source, `wrangler.jsonc`, logs, screenshots, issues, or chat.
- API responses are non-cacheable and error logs intentionally omit user and Reddit content.
- The Worker validates moderator-community membership again before every scan.
- Scan bodies are measured and capped at 2 KB, and recent-submission responses are defensively capped at 25 items.

The public threat model is maintained in `THREAT_MODEL.md`. CI runs the complete typecheck, test, and production build; CodeQL scans JavaScript and TypeScript changes; Dependabot monitors npm and GitHub Actions dependencies.

## Supported versions

Only the latest deployed version and the current default branch receive security updates.
