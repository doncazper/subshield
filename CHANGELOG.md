# Changelog

All notable user-visible and security-relevant changes are recorded here.

## Unreleased

- Added a no-OAuth manual review path for one submission or a JSON queue of up to 25 moderator-supplied items.
- Added explicit zero-request labeling, Reddit-reference validation, browser-only scoring, and manual queue controls.
- Documented the manual path as the local core workflow and OAuth as the live-community enhancement.

## 0.1.0 — 2026-07-13

- Published the external, read-only Reddit OAuth moderation review application.
- Added an honest approval-pending state and a synthetic local product demo.
- Made the demo start empty and process examples only after explicit user action.
- Replaced opaque risk labels with deterministic rule-match counts and explanations.
- Published privacy, terms, API/security, architecture, data-practice, reviewer, and threat-model documentation.
- Enforced moderator-community revalidation, same-origin mutation requests, measured 2 KB scan bodies, temporary encrypted sessions, no-store responses, and a defensive 25-item cap.
- Added CI, CodeQL, Dependabot, scoring tests, OAuth/session tests, and Worker policy-boundary tests.
- Added explicit service-unavailable UI states, bounded Reddit fetches, rate-limit handling, a per-session scan cooldown, and OAuth happy-path coverage.
