# SubShield Reviewer Guide

This guide maps SubShield's product claims to the deployed interface, source code, and automated evidence. It describes the same external, read-only OAuth use case submitted to Reddit on July 13, 2026.

## Current review state

- Live deployment: <https://subshield-review.subshield.workers.dev>
- OAuth state: disabled until Reddit approves the Data API request and issues credentials
- Approval-pending demo: synthetic local examples only; it does not call Reddit
- Source: <https://github.com/doncazper/subshield>
- Operator account in the submitted request: `u/doncazper`

The live `/api/health` endpoint reports only whether OAuth is configured plus the declared access mode, storage boundary, and scopes. It sets `Cache-Control: no-store` and contains no user data.

## Product walkthrough

1. Open the live application and confirm the header shows **Account connection unavailable**.
2. Click **Explore the moderator workflow**.
3. Confirm the scan panel starts empty and states that nothing has been processed.
4. Choose a named synthetic scenario and confirm the panel states **Local-only: 0 Reddit requests**.
5. Click **Run preview scan**.
6. Confirm the selected explicitly synthetic submissions appear.
7. Expand **View rules** to inspect the exact deterministic phrases, domain, link, punctuation, or formatting rules that matched.
8. Clear the results and confirm the interface returns to an empty state.

Once Reddit credentials are configured, anonymous users receive a standard **Connect Reddit account** action instead. Authenticated users can select only communities returned by Reddit's moderated-community endpoint.

## Claim-to-evidence map

| Claim | Implementation evidence | Automated evidence |
|---|---|---|
| Temporary OAuth only | `src/worker/index.ts` uses `duration=temporary` and requests no refresh token | Approval-pending redirect and OAuth state mismatch tests |
| Read-only scopes | `scope=identity read mysubreddits` in `src/worker/index.ts` | `/api/health` contract test |
| One moderated community | Scan handler re-fetches moderated communities and rejects non-membership | Moderator revalidation and unauthorized-community tests |
| At most 25 submissions | Reddit endpoint includes `limit=25`; response mapping defensively slices to 25 | 30-item upstream fixture returns exactly 25 results |
| No background access | No scheduled, queue, alarm, stream, polling, or webhook handlers exist | Source review and Wrangler configuration |
| No Reddit-content persistence | No storage bindings; responses use no-store headers; browser uses React state | Health contract, scan response, and response-minimization tests |
| No AI or sensitive inference | `src/shared/scoring.ts` contains the complete deterministic rules | Scoring tests and public rule explanations |
| Human moderation only | No Reddit write endpoints or scopes; production permalinks open on Reddit | Scope and API-surface review |
| Encrypted short session | AES-GCM cookie, maximum one-hour token lifetime, secure cookie attributes | Encryption, wrong-key, cookie, and expired-session tests |
| Login CSRF protection | Random encrypted OAuth state with expiry and constant-time comparison | OAuth state mismatch rejection test |

## Exact API budget

- Session load: `GET /api/v1/me` and `GET /subreddits/mine/moderator`, in parallel, only for an authorized session.
- User-triggered scan: one moderated-community recheck and one `GET /r/{subreddit}/new?limit=25` request.
- No pagination, retries that multiply requests, background jobs, schedules, streams, or bulk exports.

## Public policies and support

- Privacy: <https://subshield-review.subshield.workers.dev/privacy>
- API and security: <https://subshield-review.subshield.workers.dev/security>
- Terms: <https://subshield-review.subshield.workers.dev/terms>
- Private vulnerability reporting: <https://github.com/doncazper/subshield/security/advisories/new>

SubShield is independent open-source software and is not affiliated with or endorsed by Reddit.
