# DevMetric — GitHub Profile Analyzer

> Built by [Abdul Wahid](https://github.com/abduIwahid) — BS Artificial Intelligence student at COMSATS University Islamabad (Attock Campus). One of a series of dependency-free apps I built against free public APIs to practise real-world API constraints: rate limits, caching, and payload normalisation. More at [abdulwahid.me](https://www.abdulwahid.me).


Enter any GitHub username and get a real analysis: profile summary, language breakdown, top and most recent repositories, total stars and forks — plus live rate-limit status. Recruiters can try it with their own username; the link is shareable (`?user=anyone`).

**Live demo:** https://abduiwahid.github.io/devmetric-github-analyzer/ (GitHub Pages, deployed by the owner)
Run it locally: serve the folder (`python3 -m http.server`) and visit `http://localhost:8000`. (Serve over HTTP rather than `file://` so the shareable-URL feature works.)

## Features

- **Profile card** — avatar, name, bio, followers/following, public repo count, account age.
- **Footprint panel** — the share of the account that is original work rather than forks, how many own repos were pushed in the last year, and the most-used language.
- **Profile score (0–100)** — every analysis ends in a score with a visible breakdown: Originality (30) from the original-work share, Activity (25) from repos pushed in the last year, Reach (20, log-scaled) from followers/stars/forks, Craft (15) from repos carrying descriptions and detected languages, Longevity (10) from account age. The formula is in the code and the panel labels it as DevMetric's own summary, not an official GitHub measure.
- **Full repo sweep** — paginates `per_page=100` until a short page (capped at 5 pages / 500 repos).
- **Language breakdown** — bar chart drawn with plain divs (no chart library), computed from the repo list's own `language` field, forks and null languages excluded.
- **Top 5 by stars + 5 most recently pushed**, with totals for stars and forks across own repositories.
- **Rate-limit awareness** — after every response the UI shows "API calls left: N (resets HH:MM)" from the `X-RateLimit-*` headers; the 403 rate-limit error names the reset time.
- **Shareable URLs** — searching sets `?user={name}`; opening such a link auto-loads that profile.
- **ETag caching** — responses are cached in localStorage with their ETags. Repeat analyses send `If-None-Match`; a `304` reuses the cache and **does not consume rate limit**.

## Design

Frontend redesigned 2026-11-11: GitHub-native dark hero over a light data surface, Sora display type with Inter UI text and JetBrains Mono for every number, stat tiles instead of a bare stat row, the Footprint numbers promoted to highlight tiles, one-tap sample usernames, and a bars-chart brand mark (also the favicon). Solid colours only — no gradients, no glass. Fluid `clamp()` sizing; verified at phone (414px) and desktop widths with a full analysis rendered.

## Engineering decisions

- **N+1 avoidance is the headline.** GitHub offers a per-repo `/languages` endpoint with byte-accurate data — at one API call per repo. At the unauthenticated 60 requests/hour, analysing a 30-repo user that way would burn half the hourly quota on one profile. DevMetric aggregates the repo list's `language` field instead: the whole analysis costs 1 + ⌈repos/100⌉ calls.
- **Rate limits are a UI feature, not a surprise.** The quota line updates from response headers after every call, turns red at ≤5 remaining, and the limit error state tells the user exactly when the quota resets.
- **No token UI (removed 2026-11-11, owner's call).** An earlier version let visitors paste their own token to raise the 60/hour limit to 5,000/hour. The owner removed it: the public app should read as one clean tool, not ask visitors for credentials. The fetch layer still honours a token already present in localStorage (power users can set `devmetric:token` manually), but nothing in the UI asks for one.
- **Mapper/aggregation layer.** Raw payloads are converted by `mapProfile()` and `aggregateRepos()` (totals, sorting, fork filtering) before anything renders.
- **Pagination discipline.** Pages are fetched sequentially and the loop stops at the first short page; a hard cap of 5 pages bounds worst-case quota use.

## Attribution

Public data from the [GitHub REST API](https://docs.github.com/en/rest), used under GitHub's Terms of Service. GitHub and the Octocat logo are trademarks of GitHub, Inc.; this is an independent portfolio project.

## Trade-offs

- Language share is the share of own repos *with a detected language* (the denominator is stated in the UI), repo-count-based rather than byte-based — the honest cost of avoiding N+1 calls at a 60/hour limit.
- ETag cache entries live in localStorage (≈5 MB shared quota); very heavy use may evict older entries, which degrades to normal fetching, never to an error.
- The 500-repo cap means extremely prolific accounts are analysed on their first 500 repos (the API's default order), which the code states openly.
