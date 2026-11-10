# Changelog — DevMetric

Format: Change → Reason → Affected Area → Impact → Status.

## 2026-11-10 — Project initialized + Phase 1 MVP built
- **Change:** Created the full static app (index.html, styles.css, app.js), README, AGENT.md and this brain.
- **Reason:** Portfolio project #5 (capstone) from the "5 Free APIs → 5 Portfolio Projects" guide; demonstrates pagination, N+1 avoidance, rate-limit handling and ETag caching against the GitHub REST API.
- **Affected Area:** Entire repo (new).
- **Impact:** Complete analyzer runs from static files; not yet deployed.
- **Status:** Verified — `node --check app.js` passes; user/repo field names, rate-limit headers and the ETag → 304 round-trip confirmed against the live GitHub API.

- **Change:** Added the Footprint panel (original-work share, repos pushed in the last year, most-used language) and fixed the language-share denominator (share of own repos WITH a detected language, labelled as such) → **Reason:** owner asked for the repos to look genuinely worked on, and reviewing the aggregation surfaced the denominator flaw → **Affected Area:** `app.js` → **Status:** Verified locally (node --check + render test).
- **Change:** First-person About section in the app (why it was built, the 60/hour constraint story, author signature) + README author line and Footprint feature entry → **Reason:** the repo should read as its author's own project, in his own voice → **Affected Area:** `index.html`, `styles.css`, `README.md` → **Status:** Verified locally.
