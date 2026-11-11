# Session 2026-11-11-02 — Profile score + frontend cleanup

## Goal / request
Two owner instructions in one round: (1) remove from the frontend
everything circled in his annotated screenshot — the Try chips row
and the token settings section; (2) add a GitHub profile score out
of 100, so analysing a profile yields a score.

## What was done
- index.html: Try row + settings <details> deleted. The quota line
  stays (information, not input).
- app.js: token UI wiring and Try-chip wiring removed; the saved
  token (his own, entered earlier) is still honoured by the fetch
  layer — his screenshot showed 4,968 calls left, and removing the
  UI must not silently drop him back to 60/hour. Rate-limit error
  copy no longer references the removed settings section.
- app.js: computeScore(profile, agg, repos) — Originality 30
  (original-work share), Activity 25 (repos pushed in the last
  year, full at 20), Reach 20 (log-scaled followers/stars/forks),
  Craft 15 (descriptions + detected languages), Longevity 10
  (account age, full at 5 years). Rendered as a score panel with a
  conic ring and five component bars, each with its evidence note,
  and an explicit "not an official GitHub measure" label.
- styles.css: score components; dead Try/settings CSS removed.

## Verification
- node --check OK; every remaining getElementById target exists.
- Score exercised on the owner's real payloads: 80/100 "Strong"
  (Originality 24, Activity 25, Reach 14, Craft 13, Longevity 4;
  parts sum to the total).

## Addendum — premium pass + language layout (same day)
Premium pass shipped in the same commit (eabc266): SVG icons for
star/fork/external-link (no glyph characters), staggered rise-in on
panels, hover lifts/washes, button loading state, designed dark
footer; live-verified on Pages. Language rows then restructured to
the two-line layout (label+% line, full-width bar) because the
three-column intrinsic-track grid was what Safari kept mangling.
