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

- **Change:** Frontend redesign v2 — dark hero with display headline + feature chips, brand mark + favicon, Sora/Inter/JetBrains Mono type system, stat tiles, Footprint highlight tiles, one-tap sample usernames, "View on GitHub" pill, deeper shadows and radius system, fluid clamp() sizing → **Reason:** owner asked for the frontend improved using the components/patterns he supplied (UI Layouts library + saved design brain) → **Affected Area:** `index.html`, `styles.css`, `app.js` (render markup only — logic, ids and data flow untouched) → **Status:** Verified locally with the full analysis rendered at 1280px and 414px (mocked API responses; headless Chrome cannot reach api.github.com directly in this sandbox).

- **Change:** Removed the Try chips and the token settings section from the frontend (owner's order, from his annotated screenshot) + rate-limit error copy updated (no longer points at a settings section) → **Reason:** the public app should be one clean tool; nothing asks the visitor for input beyond the username → **Affected Area:** `index.html`, `app.js`, `styles.css` → **Status:** Verified locally (node --check; id cross-check clean).
- **Change:** Profile score 0–100 added — ring + five-component breakdown (Originality 30, Activity 25, Reach 20 log-scaled, Craft 15, Longevity 10), computed from already-fetched data, labelled as DevMetric's own summary → **Reason:** owner's feature request — an analysed profile should end in a score → **Affected Area:** `app.js`, `styles.css` → **Status:** Verified: score logic exercised on the owner's real payloads → 80/100 "Strong" (24+25+14+13+4).

- **Change:** Language bars fix — `.lang-track`/`.lang-fill` are inline <span>s by default, so width/height never applied and the fills rendered invisible (owner's screenshot: empty grey tracks) → spans now display:block → **Reason:** real bug on the live site → **Affected Area:** `styles.css` → **Status:** Root cause confirmed in code; re-verified in the 414px render after the fix.
- **Change:** Score ring rebuilt — the inner disc used % sizes of a flex item (the same class of quirk made Safari collapse it into an oval blob) → fixed em padding instead; Footprint tiles get overflow-wrap → **Reason:** owner's phone render showed the ring as a green oval → **Affected Area:** `styles.css` → **Status:** Re-verified in renders.

- **Correction (same round, before push):** measurement on the owner's own screenshots showed the language rows are actually a 3-COLUMN layout (label | track | %) — the fills render at 100% of a track ~163px wide, and half the rows clip mid-bar in Safari. The grid fix landed with this push: label track minmax(0,1fr), labels min-width:0, and the stat tiles measured clean (tile w = scrollWidth, no content overflow). Safari's exact mid-row crop still needs the owner's eyes on the next deploy.
