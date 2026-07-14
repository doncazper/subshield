# Changelog

All notable user-visible and security-relevant changes are recorded here.

## 0.1.0 — 2026-07-13

- Published the external, read-only Reddit OAuth moderation review application.
- Added an honest approval-pending state and a synthetic local product demo.
- Made the demo start empty and process examples only after explicit user action.
- Replaced opaque risk labels with deterministic rule-match counts and explanations.
- Published privacy, terms, API/security, architecture, data-practice, reviewer, and threat-model documentation.
- Enforced moderator-community revalidation, same-origin mutation requests, measured 2 KB scan bodies, temporary encrypted sessions, no-store responses, and a defensive 25-item cap.
- Added CI, CodeQL, Dependabot, scoring tests, OAuth/session tests, and Worker policy-boundary tests.
