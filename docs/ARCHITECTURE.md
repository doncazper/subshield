# Architecture

SubShield is one stateless Cloudflare Worker deployment containing a React static application and a small Reddit OAuth/API boundary.

```text
┌──────────────────────────── Browser ────────────────────────────┐
│ React UI                                                       │
│ - manual entry/JSON queue (browser memory only)               │
│ - explicit OAuth action                                       │
│ - one moderated-community selector                            │
│ - one user-triggered scan                                     │
│ - response-only rule explanations                             │
└───────────────────────────┬────────────────────────────────────┘
                            │ same-origin HTTPS
                            ▼
┌──────────────────── Cloudflare Worker ─────────────────────────┐
│ OAuth state + temporary session encrypted into HttpOnly cookie │
│ moderator membership revalidation                              │
│ 2 KB scan-body limit                                           │
│ short per-session scan cooldown                               │
│ deterministic in-memory scoring (OAuth branch)                │
│ no-store JSON responses                                        │
│ no persistent Reddit-content bindings                          │
└───────────────────────────┬────────────────────────────────────┘
                            │ temporary Bearer token (OAuth branch only)
                            ▼
┌──────────────────────────── Reddit ────────────────────────────┐
│ /api/v1/me                                                     │
│ /subreddits/mine/moderator                                     │
│ /r/{subreddit}/new?limit=25                                    │
└────────────────────────────────────────────────────────────────┘
```

## Public routes

| Route | Purpose | Cache policy |
|---|---|---|
| `/` | Product and synthetic workflow preview | Static document |
| `/privacy` | Public privacy and data practices | `no-store` |
| `/security` | Public API and security details | `no-store` |
| `/terms` | Public terms | `no-store` |
| `/api/health` | Configuration state and declared scope metadata | `no-store` |
| `/api/auth/reddit` | Start temporary Reddit OAuth when configured | redirect, `no-store` |
| `/oauth/callback` | Verify state and exchange an authorization code | redirect, `no-store` |
| `/api/session` | Load identity and moderated communities for a valid session | `no-store` |
| `/api/scan` | Revalidate membership and process one bounded scan | `no-store` |
| `/api/logout` | Clear the encrypted session cookie | `no-store` |

## Runtime data lifecycle

1. OAuth state exists only in a sealed browser cookie for at most ten minutes.
2. The temporary access token exists only in a sealed browser cookie for at most one hour and in Worker request memory during API calls.
3. Reddit identity and moderated-community names exist only in Worker request memory and the current browser state.
4. Manual entries are supplied deliberately by the moderator, scored in the browser, and never sent to the Worker or Reddit.
5. Submission self-text is used during scoring and deliberately omitted from the response.
6. Returned titles, domains, permalinks, timestamps, and rule matches remain only in the current browser state until cleared, navigation, or tab closure.

There are no KV, D1, R2, Durable Object, Queue, database, file, or content-analytics bindings.
