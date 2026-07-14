# Local Demo Test Checklist

This checklist exercises the public workflow preview without a Reddit account or any Reddit request. The scenarios are static examples bundled with the client; they contain no Reddit permalinks or content.

1. Open the local or live SubShield application and confirm the header reads **Account connection unavailable**.
2. Select **Mixed review queue**, run the preview, and expand **View rules** on both a promotional and a safety-language result.
3. Select **Promotional patterns**, run the preview, and confirm at least one row has spam-rule matches.
4. Select **Safety language**, run the preview, and confirm at least one row has safety-rule matches.
5. Select **Clear queue**, run the preview, and confirm every row says **No matches** for both rule types.
6. On each scenario, verify the source panel says **Local-only: 0 Reddit requests**.
7. Select **Clear results** and confirm the panel returns to its empty state.

The result details show the deterministic rule reasons evaluated by the demo. This is only a product preview while OAuth access remains disabled pending Reddit approval.
