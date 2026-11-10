# Tools — DevMetric

**API: GitHub REST** — public data needs no key. Documented limits: 60 requests/hour unauthenticated per IP; 5,000/hour with a token; Search API has separate limits (not used here). Conditional (ETag) requests answered 304 do not count.

**Hosting plan:** static files only — GitHub Pages or Vercel static. **TBD by owner.** Note: serve over HTTP(S) — the shareable-URL feature needs a real URL (it degrades gracefully on `file://`).

**Fallback if the API is down or limited:** cached profiles still render from localStorage when GitHub answers 304/unreachable-after-cache; otherwise the error state explains the situation and the reset time. There is no mirror of GitHub's data — none exists.

**Accounts needed:** none. A token is optional and belongs to the visitor.
