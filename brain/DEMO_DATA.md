# Demo data — DevMetric

- **Default input:** `abduIwahid` (the owner's profile — 26 public repos at build time, so the sweep finishes in 2 requests).
- **Big profile:** `torvalds` or `gaearon` — shows pagination, language diversity and the cap behaviour.
- **404 state:** analyse `this-user-does-not-exist-zzz123`.
- **ETag demo:** analyse the same user twice — the second run reports responses "served from ETag cache" and the quota line barely moves.
- **Shareable URL:** after a search, copy the `?user=` URL, open it in a fresh tab — the analysis loads automatically.
- **Quota demo:** watch "API calls left" decrease by exactly the number of pages the profile needed.
