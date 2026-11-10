# API spec — GitHub REST API (https://api.github.com)

Auth: none by default (60 requests/hour per IP). Optional visitor token via `Authorization: Bearer <token>` raises the core limit to 5,000/hour. GraphQL is not used (it requires a token even for public data).

| Endpoint | Used for | Response fields consumed |
|---|---|---|
| `GET /users/{username}` | Profile card | `login`, `name`, `bio`, `avatar_url`, `html_url`, `followers`, `following`, `public_repos`, `created_at` |
| `GET /users/{username}/repos?per_page=100&page=N` | Repo sweep (N ≤ 5, stop at short page) | `name`, `html_url`, `description`, `stargazers_count`, `forks_count`, `language` (nullable), `fork`, `pushed_at` |

**Headers read on every response:** `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch seconds), `ETag`.

**Conditional requests:** repeat calls send `If-None-Match: <etag>`; `304 Not Modified` ⇒ use the localStorage copy. 304 responses do not count against the rate limit.

**Errors:** unknown user → 404. Rate limit exhausted → 403 (or 429) with `X-RateLimit-Reset`; the error state shows the reset time and the token option.

**Deliberately NOT used:** `GET /repos/{owner}/{repo}/languages` per repo — accurate byte counts, but N+1 calls; at 60/hour it makes the app unusable tokenless.

**Verified live 2026-11-10:** user + repo field names confirmed against `abduIwahid`; rate-limit headers present (limit 60); ETag round-trip confirmed — `If-None-Match` with a current ETag returns 304.
