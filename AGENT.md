# DevMetric — GitHub Profile Analyzer: agent entry
Summary: Static analyzer for GitHub profiles (REST API, token optional). Profile card, language bars, top/recent repos, rate-limit display, shareable ?user= URLs, ETag caching. Vanilla HTML/CSS/JS, no build step.
Core feature: A complete profile analysis that costs 1 + pages API calls and respects the rate limit visibly.
Read first: `brain/00-START-HERE.md`, then `brain/PRD.md` and `brain/ARCHITECTURE.md`.
Hard rules: design tokens only (see brain/DESIGN.md); NEVER hardcode a token — visitor-entered, localStorage only; every change is logged in `brain/changes/` (changelog + session file).
Commands: `python3 -m http.server` then visit http://localhost:8000 . Syntax check: `node --check app.js`.
