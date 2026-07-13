# Contributing

Thank you for helping make SubShield safer and more useful.

Before opening a pull request:

1. Keep the app read-only and on-demand.
2. Do not add persistent Reddit-content storage, background monitoring, third-party data transfers, AI/ML providers, or write scopes without prior policy review and explicit project approval.
3. Update `DATA_PRACTICES.md`, the public privacy page, and `REDDIT_APPLICATION.md` when data access or processing changes.
4. Add tests for changed scoring or authorization behavior.
5. Run `npm run check` and `npm run deploy:dry`.

Use synthetic examples in tests, screenshots, and issues. Never include live Reddit tokens, client secrets, OAuth codes, cookies, private subreddit data, usernames, or copied user content.
