# SubShield

SubShield is an open-source, external Reddit OAuth web application for authorized subreddit moderators. A moderator connects their own Reddit account, chooses one community they moderate, and runs an on-demand, rules-based scan of up to 25 recent public submissions. The response helps prioritize human review; SubShield never takes a moderation action.

The project is intentionally narrow:

- read-only OAuth scopes: `identity`, `read`, and `mysubreddits`
- one moderator-selected community per scan
- no polling, streams, background monitoring, or webhooks
- no database, object storage, analytics payloads, or Reddit-content logs
- no machine-learning inference, model training, sentiment profiling, or sensitive-attribute inference
- temporary Reddit authorization only; no refresh token is requested

SubShield is not affiliated with or endorsed by Reddit.

Live application: [https://subshield-review.subshield.workers.dev](https://subshield-review.subshield.workers.dev)

## Product flow

1. The user explicitly starts Reddit OAuth and grants three read-only scopes.
2. Reddit returns a temporary access token that expires in at most one hour.
3. The token is encrypted in an essential, `HttpOnly`, `Secure`, `SameSite=Lax` cookie. It is not stored server-side.
4. The app lists only communities the connected user moderates.
5. The user chooses one community and clicks **Run ephemeral scan**.
6. The Worker requests at most 25 recent public submissions, evaluates published deterministic rules in request memory, and returns the response with `Cache-Control: no-store`.
7. Reddit content and derived scores are not written to storage or logs. The browser holds the response only in React state until it is cleared or the page is closed.

## OAuth scopes

| Scope | Endpoint | Purpose |
|---|---|---|
| `identity` | `GET /api/v1/me` | Show which Reddit account is connected. |
| `mysubreddits` | `GET /subreddits/mine/moderator` | Populate the selector with communities the user moderates. |
| `read` | `GET /r/{subreddit}/new` | Read up to 25 recent public submissions from the selected community. |

No write, vote, history, private-message, mod-action, or permanent-access scope is requested.

## Architecture

SubShield is a React + Vite single-page application and a stateless Cloudflare Worker deployed as one unit with Workers Static Assets.

```text
Browser ── explicit OAuth ──> Reddit
   │                            │
   │ encrypted temporary cookie│
   ▼                            ▼
Cloudflare Worker ── read-only OAuth API calls
   │
   ├─ validates OAuth state and moderator-community membership
   ├─ evaluates deterministic rules in request memory
   └─ returns no-store response; writes no Reddit data
```

The only production secrets are the Reddit web-app client secret and a cookie-encryption key. They must be configured with Cloudflare encrypted secrets after Reddit approves the OAuth client. Placeholder values in `wrangler.jsonc` deliberately keep OAuth disabled before approval.

## Local development

Requirements: Node.js 22.2 or later.

```bash
npm install
npm run cf:types
npm run dev
```

The Vite development server provides the synthetic, fully local product preview. To test the Worker and static assets together:

```bash
npm run build
npx wrangler dev
```

For a real OAuth test, create `.dev.vars` (never commit it):

```dotenv
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
COOKIE_KEY=a_random_secret_with_at_least_32_characters
```

The registered Reddit redirect URI must exactly match:

```text
https://subshield-review.subshield.workers.dev/oauth/callback
```

## Validation

```bash
npm run check
npm run deploy:dry
```

The test suite covers the published scoring rules, including ordinary content, promotional spam combinations, direct-threat patterns, response minimization, and reason de-duplication.

## Deployment

1. Deploy the approval-pending build to obtain a stable HTTPS origin.
2. Register that origin and `/oauth/callback` in Reddit’s web-app application request.
3. After Reddit issues the client ID and secret, remove the three `PENDING_APPROVAL` variables from `wrangler.jsonc`, declare the secret bindings, and set them with `wrangler secret put`.
4. Generate a cryptographically random cookie key of at least 32 characters and store it only as a Cloudflare secret.
5. Run the full checks and redeploy.

## Policy and review documents

- [Privacy and data practices](./DATA_PRACTICES.md)
- [Reddit application answers](./REDDIT_APPLICATION.md)
- [Security policy](./SECURITY.md)
- [Terms shown in the app](./src/client/components/PolicyPage.tsx)

## License

MIT — see [LICENSE](./LICENSE).
