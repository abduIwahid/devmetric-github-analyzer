# Risks — DevMetric

1. **Rate limit exhaustion (60/hour shared per IP)** → Whole analysis costs 1 + pages calls; ETag cache makes repeats free; quota is displayed live; token option documented in the error state itself.
2. **Token misuse fears** → The token is the visitor's own, stored only in their browser, sent only to api.github.com, masked as a password field, and clearable in one click. Nothing is logged or transmitted elsewhere. README states this plainly.
3. **Very large accounts** → 5-page cap bounds the analysis at 500 repos and 6 requests worst case; the cap is disclosed in the README.
4. **GitHub API changes/downtime** → Typed error handling per status; no assumption beyond the documented REST contract verified 2026-11-10.
