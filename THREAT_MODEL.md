# Threat Model

## Scope

This threat model covers the SubShield browser client, stateless Cloudflare Worker, Reddit OAuth flow, read-only Reddit API requests, and the no-OAuth manual-review path. It assumes Reddit has approved the OAuth client and the three production secrets are stored as encrypted Cloudflare secrets.

## Protected assets

- Reddit OAuth authorization codes and temporary access tokens
- OAuth state nonces and the cookie-encryption key
- The connected username and moderated-community list while a request is active
- Up to 25 recent public submissions and derived rule matches during a scan
- Up to 25 moderator-supplied manual entries and derived rule matches while the page is open
- Reddit client credentials and deployment integrity

SubShield does not maintain an account database or persistent Reddit-content store.

## Trust boundaries

1. **Browser to Worker** — untrusted requests enter the public HTTPS origin.
2. **Worker to Reddit** — authenticated requests leave the Worker using Reddit-issued temporary access tokens.
3. **Worker runtime** — request memory and encrypted environment secrets are trusted; logs and standard infrastructure metadata are minimized.
4. **Static source to production** — GitHub CI, CodeQL, and Cloudflare deployment form the release boundary.

## Threats and mitigations

| Threat | Mitigation | Verification |
|---|---|---|
| Login CSRF or callback substitution | Cryptographically random state, AES-GCM sealed state cookie, ten-minute expiry, constant-time comparison | State-mismatch test |
| Session-token disclosure to browser scripts | `HttpOnly`, `Secure`, `SameSite=Lax` encrypted cookie | Cookie-attribute and encryption tests |
| Long-lived authorization | `duration=temporary`, no refresh token, token lifetime capped at one hour | Source and session-expiry test |
| Unauthorized community access | Server re-fetches moderated communities and case-insensitively matches the requested community before every scan | Membership tests |
| Cross-site scan/logout request | Same-origin `Origin` validation on mutation endpoints | Cross-origin test |
| Request-body abuse | Header check plus measured UTF-8 body limit of 2 KB; malformed JSON returns 400 | Oversize and malformed-body tests |
| Excessive Reddit data retrieval | One community, one newest-listing request, `limit=25`, defensive 25-item slice, no pagination | 30-item fixture capped to 25 |
| Accidental repeated scans | Session-carried cooldown returns `429` with `Retry-After` before another Reddit request | Scan cooldown test |
| Persistent collection | No storage bindings or content log fields; no-store headers; response-only processing | Config review and response tests |
| Manual input used as a fetch pivot | Manual references are constrained to Reddit paths/hosts for display, and the client performs no URL fetch | Manual validation tests and browser review |
| Sensitive or opaque inference | Complete deterministic rule list in source; UI displays matched reasons; no author field in scoring output | Scoring and response-minimization tests |
| Secret leakage in errors | Generic client error; structured server log includes only request path and error class | Source review and CodeQL |
| Dependency or source vulnerability | Locked dependencies, CI, CodeQL, Dependabot, private disclosure channel | GitHub security automation |

## Abuse cases intentionally unsupported

- background, scheduled, or streaming monitoring
- subreddit-wide archives, pagination, or historical exports
- cross-community aggregation or longitudinal profiles
- automated posts, comments, votes, reports, messages, or moderation actions
- advertising, commercial resale, AI/ML training, sentiment analysis, or sensitive-attribute inference
- webhooks, Slack alerts, third-party analytics, or external content-processing services

## Residual risks

- A compromised moderator browser can access content already visible in that browser session.
- Cloudflare and Reddit process ordinary network and security metadata under their own terms.
- Deterministic rules can produce false positives; the UI presents matches as review prompts, never factual determinations.
- Reddit may change its API, policies, rate limits, or approval conditions. SubShield must stop or adapt before using incompatible access.
- A determined client can discard its cookie and retry; production deployment should also apply a Cloudflare edge rate-limit rule to `POST /api/scan`.

## Change gate

Any new endpoint, scope, persistent store, background task, external transfer, ML provider, or write action requires an updated threat model, privacy documentation, tests, and Reddit approval before production use when required.
