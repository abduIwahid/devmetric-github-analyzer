# Session 2026-11-10-02 — Personal pass: Footprint, denominator fix, About

## Goal / request
Owner: fix the 5 repos one by one, starting with the GitHub
analyzer, so each repo reads like his own worked-on project rather
than something copied. This session covers DevMetric only.

## What was done
- app.js: new Footprint panel — original-work percentage (own vs
  forks), own repos pushed in the last 12 months, most-used
  language. All computed in aggregateRepos() from data already
  fetched; zero extra API calls.
- app.js: language-share denominator corrected. Percentages were
  computed over ALL own repos including null-language ones, so the
  bars could not sum to 100%. Now the share is over own repos with a
  detected language, and the panel label + README trade-offs say
  exactly that.
- index.html + styles.css: an "About this project" section in first
  person — why the tool exists (the original-work question), the
  60/hour constraint and the aggregation answer to it, and the
  author's signature (name, degree, campus, portfolio link).
- README.md: author byline at the top; Footprint added to Features;
  trade-offs line corrected for the new denominator.

## Verification
- node --check app.js: OK.
- Local render test against the owner's own profile planned before
  push (serve folder, ?user=abduIwahid, screenshot the panels).
