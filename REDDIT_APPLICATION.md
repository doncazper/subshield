# Reddit Data API Application Answers

These answers describe the code in this repository and must be kept accurate. Do not copy them into a Reddit form if the deployed behavior differs.

## Application name

SubShield

## Application type

Web app

## Short description

SubShield is an open-source, read-only moderation review workspace for authorized subreddit moderators. A moderator explicitly connects their Reddit account, chooses one community they moderate, and runs an on-demand rules-based scan of up to 25 recent public submissions to surface configured spam and safety-rule matches for human review.

## Detailed use case

SubShield helps moderators prioritize a small, current review set without automating moderation actions. It does not run a stream or background poll. Nothing is fetched until the connected moderator selects a community and clicks **Run ephemeral scan**. The app validates that the user moderates the requested community, fetches at most 25 recent public submissions, evaluates a published deterministic spam and safety-phrase rule set in request memory, returns the matched rules to that moderator, and discards the Reddit response after the request completes.

The app never posts, comments, votes, reports, removes, approves, locks, distinguishes, or messages. Every decision and action remains with the moderator on Reddit.

## Why an external web application

SubShield’s product surface is a dedicated, accessible browser review workspace that moderators can open alongside Reddit. It uses standard Reddit user OAuth so every user grants their own narrow read-only access, and it keeps the confidential client secret on a server-side Worker. The hosted site also provides public, versioned privacy, terms, security, scope, and source-code documentation. The app does not use external hosting to collect data or evade Reddit controls.

## Requested scopes

- `identity` — call `GET /api/v1/me` only to show the connected Reddit username.
- `mysubreddits` — call `GET /subreddits/mine/moderator` only to populate and validate the moderator’s selectable communities.
- `read` — call `GET /r/{subreddit}/new` for at most 25 recent public submissions from the single selected community.

No `history`, write, vote, submit, report, private-message, or moderator-action scopes are requested. OAuth uses `duration=temporary`; the app does not request a refresh token.

## Data handling and retention

SubShield has no database or Reddit-content storage. Reddit content, community names, usernames, scan results, and derived scores are never written to KV, D1, R2, files, queues, logs, or analytics. They exist only in Worker request memory and the current browser’s React state. Scan and session responses set `Cache-Control: no-store`.

The temporary access token is encrypted into an essential `HttpOnly`, `Secure`, `SameSite=Lax` cookie that expires with the token in at most one hour. It is not stored server-side. The OAuth state cookie expires after ten minutes. Logging out clears the session cookie immediately. No refresh token is requested or retained.

## Automated processing

The rules are deterministic string, domain, link-count, punctuation, and formatting checks committed in `src/shared/scoring.ts`. The app does not use an LLM, machine-learning model, external toxicity API, or sentiment model. It does not infer sensitive characteristics, build user profiles, or train models.

## Third parties

Cloudflare hosts the stateless Worker and static assets. Reddit content is not written to Cloudflare storage or sent to analytics, Slack, webhooks, AI providers, or any other third party. Standard hosting/network security metadata may be processed by Cloudflare as the infrastructure provider.

## User controls

Users explicitly authorize the app, start every scan themselves, choose exactly one community per scan, can clear results immediately, can log out to clear the auth cookie, and can revoke the app from Reddit’s connected-app settings.

## Rate and volume limits

Each user-triggered scan makes one moderated-community membership request and one recent-submissions request capped at 25 items. There are no background requests, scheduled jobs, streams, bulk exports, pagination loops, or attempts to exceed Reddit rate limits.

## Public URLs

- Homepage: `https://subshield-review.subshield.workers.dev`
- Privacy policy: `https://subshield-review.subshield.workers.dev/privacy`
- Terms: `https://subshield-review.subshield.workers.dev/terms`
- OAuth redirect URI: `https://subshield-review.subshield.workers.dev/oauth/callback`
- Source: `https://github.com/doncazper/subshield`

## Support and deletion contact

Repository issues are used for general support. Security or privacy-sensitive reports use the private GitHub Security Advisory workflow described in `SECURITY.md`. Since SubShield does not create accounts or retain Reddit content, logout/revocation removes the only app-held authorization state.
