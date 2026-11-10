# Interviewer Q&A — DevMetric

**Q1. Why didn't you use the /languages endpoint for accurate language data?**
Because it is one call per repository — an N+1 pattern. Unauthenticated GitHub allows 60 requests an hour; a 30-repo profile would burn half of that on languages alone. I aggregate the `language` field from the repo list I already fetched, and I label the result as repo-count share, not byte share. That trade-off is the correct call at this limit.

**Q2. How does the ETag caching actually save quota?**
Each response is stored in localStorage with its ETag. On a repeat request I send `If-None-Match`; if nothing changed GitHub answers 304 with no body, and 304s do not count against the rate limit. So re-analysing the same person is effectively free, and the status line says how many responses came from cache.

**Q3. Where does the token live, and why not just embed yours?**
Embedding any token in a static frontend exposes it to every visitor — that is a leaked credential. Here the token is the visitor's own, entered at runtime, kept in their localStorage, sent only to api.github.com. The production-grade answer is a small serverless proxy holding the token server-side, which the README documents as the trade-off of staying purely static.

**Q4. How do you know when you are about to hit the rate limit?**
Every response carries `X-RateLimit-Remaining` and `X-RateLimit-Reset`. I read them on every call — including error responses — and render "API calls left: N (resets HH:MM)", turning red at five or fewer. If a 403 lands anyway, the error state quotes the reset time.

**Q5. How does repo pagination end?**
Pages of 100, sequentially, stopping at the first short page — a full page means there may be more, a short page means the list is exhausted. I cap it at 5 pages so one analysis can never cost more than 6 requests.
