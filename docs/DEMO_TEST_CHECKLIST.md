# Local Demo Test Checklist

This checklist exercises the public workflow preview without a Reddit account or any Reddit request. The scenarios are static examples bundled with the client; they contain no Reddit permalinks or content.

1. Open the local or live SubShield application and confirm the header reads **Preview mode** while OAuth is not configured.
2. Select **Mixed review queue**, run the preview, and expand **View rules** on both a promotional and a safety-language result.
3. Select **Promotional patterns**, run the preview, and confirm at least one row has spam-rule matches.
4. Select **Safety language**, run the preview, and confirm at least one row has safety-rule matches.
5. Select **Clear queue**, run the preview, and confirm every row says **No matches** for both rule types.
6. On each scenario, verify the source panel says **Local-only: 0 Reddit requests**.
7. Select **Manual review**, enter a title, body, and optional domain, then choose **Add to review queue**.
8. Confirm the manual panel says **Manual input · 0 Reddit requests**, run **Review manual queue**, and expand **View rules**.
9. Open **Paste JSON queue**, paste an array with one or two `{ "title": "...", "selfText": "...", "domain": "self" }` objects, and confirm they are added without a network request.
10. Entering an external URL in the optional Reddit reference field should show a validation error; a Reddit permalink is reference-only and is never fetched.
11. Remove a queued manual item, select **Clear results**, and confirm the panel returns to its empty state.

The result details show the deterministic rule reasons evaluated by the demo. Manual entries are kept in React state only and disappear when the page is closed. This is the local product workflow while OAuth access remains disabled pending Reddit approval.
