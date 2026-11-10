# DevMetric — GitHub Profile Analyzer

Enter any GitHub username and get a real analysis: profile summary, language breakdown, top and most recent repositories, total stars and forks — plus live rate-limit status. Recruiters can try it with their own username; the link is shareable (`?user=anyone`).

**Live demo:** _TBD — deploy pending owner decision (GitHub Pages or Vercel static)._
Run it locally: serve the folder (`python3 -m http.server`) and visit `http://localhost:8000`. (Serve over HTTP rather than `file://` so the shareable-URL feature works.)

## Features

- **Profile card** — avatar, name, bio, followers/following, public repo count, account age.
- **Full repo sweep** — paginates `per_page=100` until a short page (capped at 5 pages / 500 repos).
- **Language breakdown** — bar chart drawn with plain divs (no chart library), computed from the repo list's own `language` field, forks and null languages excluded.
- **Top 5 by stars + 5 most recently pushed**, with totals for stars and forks across own repositories.
- **Rate-limit awareness** — after every response the UI shows "API calls left: N (resets HH:MM)" from the `X-RateLimit-*` headers; the 403 rate-limit error names the reset time.
- **Shareable URLs** — searching sets `?user={name}`; opening such a link auto-loads that profile.
- **ETag caching** — responses are cached in localStorage with their ETags. Repeat analyses send `If-None-Match`; a `304` reuses the cache and **does not consume rate limit**.
- **Optional token** — a settings field stores a visitor-supplied token in localStorage only (see below).

## Engineering decisions

- **N+1 avoidance is the headline.** GitHub offers a per-repo `/languages` endpoint with byte-accurate data — at one API call per repo. At the unauthenticated 60 requests/hour, analysing a 30-repo user that way would burn half the hourly quota on one profile. DevMetric aggregates the repo list's `language` field instead: the whole analysis costs 1 + ⌈repos/100⌉ calls.
- **Rate limits are a UI feature, not a surprise.** The quota line updates from response headers after every call, turns red at ≤5 remaining, and the limit error state tells the user exactly when the quota resets and how to raise it.
- **Why the token field exists.** Unauthenticated GitHub API calls are limited to 60/hour per IP; an authenticated token raises that to 5,000/hour. The token is the *visitor's own*, entered at runtime, stored only in their browser's localStorage, and sent only to `api.github.com`. It is never hardcoded, never logged, never sent anywhere else. For a production deployment the stronger pattern is a small serverless proxy holding the token server-side — noted here as the known trade-off of a pure static app.
- **Mapper/aggregation layer.** Raw payloads are converted by `mapProfile()` and `aggregateRepos()` (totals, sorting, fork filtering) before anything renders.
- **Pagination discipline.** Pages are fetched sequentially and the loop stops at the first short page; a hard cap of 5 pages bounds worst-case quota use.

## Attribution

Public data from the [GitHub REST API](https://docs.github.com/en/rest), used under GitHub's Terms of Service. GitHub and the Octocat logo are trademarks of GitHub, Inc.; this is an independent portfolio project.

## Trade-offs

- Language share is repo-count-based, not byte-based — the honest cost of avoiding N+1 calls at a 60/hour limit. The UI labels it as such.
- ETag cache entries live in localStorage (≈5 MB shared quota); very heavy use may evict older entries, which degrades to normal fetching, never to an error.
- The 500-repo cap means extremely prolific accounts are analysed on their first 500 repos (the API's default order), which the code states openly.
