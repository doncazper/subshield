# SubShield

[![CI](https://github.com/doncazper/subshield/actions/workflows/ci.yml/badge.svg)](https://github.com/doncazper/subshield/actions/workflows/ci.yml)
[![CodeQL](https://github.com/doncazper/subshield/actions/workflows/codeql.yml/badge.svg)](https://github.com/doncazper/subshield/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

SubShield is an open-source, external Reddit OAuth web application for authorized subreddit moderators. A moderator connects their own Reddit account, chooses one community they moderate, and runs an on-demand, deterministic scan of up to 25 recent public submissions. The response explains configured spam and safety-rule matches for human review; SubShield never takes a moderation action.

**Live application:** [https://subshield-review.subshield.workers.dev](https://subshield-review.subshield.workers.dev)

> **Access status:** Reddit Data API access was requested on July 13, 2026. Until Reddit approves and issues OAuth credentials, the public deployment keeps OAuth disabled and provides a fully local demo that uses only synthetic examples.

SubShield is intentionally narrow:

- temporary, read-only OAuth scopes: `identity`, `read`, and `mysubreddits`
- one moderator-selected community per user-triggered scan
- a hard cap of 25 recent public submissions
- no polling, streams, background monitoring, pagination loops, or webhooks
- no database, object storage, analytics payloads, or Reddit-content logs
- no machine-learning inference, model training, sentiment profiling, or sensitive-attribute inference
- no refresh token, write action, or automated moderation decision

SubShield is independent software and is not affiliated with or endorsed by Reddit.

## Reviewer quick start

1. Open the [live application](https://subshield-review.subshield.workers.dev).
2. Confirm the header shows **Account connection unavailable**. This is live deployment state, not a mock control.
3. Select **Explore the moderator workflow**, choose a sample queue, and then **Run preview scan**.
4. Confirm the interface reports **Local-only: 0 Reddit requests** and expand **View rules** on a synthetic row to inspect every deterministic match.
5. Use the short [demo test checklist](./docs/DEMO_TEST_CHECKLIST.md) to exercise every scenario.
6. Review the public [privacy page](https://subshield-review.subshield.workers.dev/privacy), [API and security page](https://subshield-review.subshield.workers.dev/security), and [terms](https://subshield-review.subshield.workers.dev/terms).
7. Use [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) for a source-to-claim map.

The approval-pending demo never contacts Reddit. After OAuth is configured, the same interface switches to the authorized moderator workflow described below.

## Product flow

1. The user explicitly starts Reddit OAuth and grants three read-only scopes.
2. Reddit returns a temporary access token that expires in at most one hour.
3. The token is encrypted into an essential, `HttpOnly`, `Secure`, `SameSite=Lax` cookie. It is not stored server-side.
4. The app lists only communities the connected user moderates.
5. The user chooses one community and clicks **Run ephemeral scan**.
6. The Worker revalidates moderator membership, requests at most 25 recent public submissions, evaluates published deterministic rules in request memory, and returns a `Cache-Control: no-store` response.
7. Reddit content and derived rule matches are not written to storage or content logs. The browser holds the response only in React state until it is cleared or the page is closed.

## OAuth scopes and endpoints

| Scope | Endpoint | Purpose |
|---|---|---|
| `identity` | `GET /api/v1/me` | Show which Reddit account is connected. |
| `mysubreddits` | `GET /subreddits/mine/moderator` | Populate and revalidate communities the user moderates. |
| `read` | `GET /r/{subreddit}/new?limit=25` | Read up to 25 recent public submissions from one selected community. |

No history, write, vote, submit, report, private-message, mod-action, or permanent-access scope is requested.

## Architecture

SubShield is a React + Vite single-page application and a stateless Cloudflare Worker deployed as one unit with Workers Static Assets.

```text
Browser ── explicit temporary OAuth ──> Reddit
   │                                      │
   │ encrypted HttpOnly session cookie   │ read-only API responses
   ▼                                      ▼
Cloudflare Worker ─────────────────────────┘
   │
   ├─ validates OAuth state and moderator-community membership
   ├─ enforces same-origin requests, a 2 KB body limit, and a 25-item cap
   ├─ evaluates deterministic rules in request memory
   └─ returns no-store responses; writes no Reddit content
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [THREAT_MODEL.md](./THREAT_MODEL.md), and [DATA_PRACTICES.md](./DATA_PRACTICES.md) for the full trust-boundary and data inventory.

## Local development

Requirements: Node.js 22.2 or later.

```bash
npm install
npm run cf:types
npm run dev
```

The Vite development server provides the synthetic, fully local product demo. To test the Worker and static assets together:

```bash
npm run build
npx wrangler dev
```

For a real OAuth test after Reddit approval, create `.dev.vars` and never commit it:

```dotenv
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
COOKIE_KEY=a_random_secret_with_at_least_32_characters
```

The registered Reddit redirect URI must exactly match:

```text
https://subshield-review.subshield.workers.dev/oauth/callback
```

## Verification

```bash
npm run check
npm run deploy:dry
```

The automated suite covers scoring transparency, encrypted session handling, secure cookie attributes, approval-pending behavior, OAuth state mismatch rejection, same-origin enforcement, actual request-body size enforcement, malformed JSON, session expiry, moderator-community revalidation, response minimization, and the 25-item cap. GitHub Actions run the complete checks and CodeQL scans JavaScript and TypeScript changes.

## Deployment

1. Deploy the approval-pending build to obtain a stable HTTPS origin.
2. Register that origin and `/oauth/callback` in Reddit's web-app application request.
3. After Reddit issues the client ID and secret, remove the three `PENDING_APPROVAL` variables from `wrangler.jsonc`, declare encrypted secret bindings, and set them with `wrangler secret put`.
4. Generate a cryptographically random cookie key of at least 32 characters and store it only as a Cloudflare secret.
5. Run the full checks, redeploy, and test the complete OAuth flow.
6. Register the approved Data API app for Reddit's app-profile labeling process when applicable.

## Review and policy documents

- [Reviewer guide](./REVIEWER_GUIDE.md)
- [Local demo test checklist](./docs/DEMO_TEST_CHECKLIST.md)
- [Privacy engineering data inventory](./DATA_PRACTICES.md)
- [Threat model](./THREAT_MODEL.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Reddit application answers](./REDDIT_APPLICATION.md)
- [Security policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)
- [Public privacy page](https://subshield-review.subshield.workers.dev/privacy)
- [Public API and security page](https://subshield-review.subshield.workers.dev/security)
- [Public terms](https://subshield-review.subshield.workers.dev/terms)

## License

MIT — see [LICENSE](./LICENSE).
