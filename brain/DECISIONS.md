# Decisions — DevMetric

## ADR-1 — Vanilla JS, no build step (2026-11-10)
The app is fetch + aggregate + render. A framework adds nothing except hiding the HTTP behaviour (headers, ETags, pagination) that is the project's entire talking point. Bars are divs for the same reason — no chart library.

## ADR-2 — Token strategy: visitor's own token, runtime only (2026-11-10)
Options: (a) no token support (60/hour ceiling), (b) hardcode the owner's token (rejected outright — a leaked credential and an abuse magnet), (c) visitor-entered token in localStorage. Chose (c), with the stronger production pattern (serverless proxy holding a token server-side) documented in the README as the known trade-off.

## ADR-3 — Aggregate the list's `language` field; never call /languages per repo (2026-11-10)
Byte-accurate language data costs N+1 calls. At 60/hour that is untenable. Repo-count-based language share from data already fetched costs zero extra calls; the UI labels the method honestly.

## ADR-4 — ETag cache in localStorage, keyed by URL (2026-11-10)
GitHub's conditional requests are free when nothing changed (304 doesn't consume quota), so the cache is both a speed and a quota optimisation. Writes are try/catch-guarded against storage quota.
