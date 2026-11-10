# PRD — DevMetric (GitHub Profile Analyzer)

**Core feature (one sentence):** Analyse any public GitHub profile — languages, top repositories, totals, account age — while treating the API rate limit as a visible, managed resource instead of an invisible failure mode.

**Problem:** Profile-analyzer demos typically ignore the two things that make the GitHub API interesting: the 60/hour unauthenticated limit, and the N+1 trap of the per-repo languages endpoint. They also break shareability — you can't send someone a link to a result.

**Target user:** Recruiters and interviewers, who can type their own username (or the candidate's) and immediately see a result — the guide calls this the highest-impact project of the five for exactly that reason.

## Scope
**MUST** — profile card; paginated repo sweep (100/page, cap 5 pages); totals; language bars from the list field (forks/null excluded); top 5 by stars; 5 most recent; quota display from headers; 404 and 403 states with reset time; shareable `?user=` URL with auto-load; ETag cache in localStorage; optional visitor token (localStorage only); loading/error/empty/offline states.
**SHOULD** — compare two users side by side. (Phase 2, not built yet.)
**COULD** — GraphQL contributions graph via a proxy; SVG stats-card endpoint. (Stretch.)

## Success criteria
- Analysing the same user twice in a row consumes quota only for the first run (304s after).
- Hitting the rate limit produces an explanation with the reset time, never a generic failure.
- A shared `?user=` link opens directly on that user's analysis.
