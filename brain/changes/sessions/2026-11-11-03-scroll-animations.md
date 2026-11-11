# Session 2026-11-11-03 — Scroll animations + hover depth

## Goal / request
Owner: animate the bars so they play when he scrolls into the
section; add a light hover depth effect where it fits.

## What was done
- IntersectionObserver (threshold 0.25) observes result panels and
  the score ring; on first intersection a panel gets .inview.
- Bars: fills render with their real width in --w + inline width,
  and under .reveal-ready sit at transform scaleX(0); .inview
  transitions transform to scaleX(1) — compositor animation, no
  layout thrash, and nothing depends on re-measuring widths.
- Ring: CSS @property --score-pct animates 0 → --score-to; the
  number counts up with an ease-out rAF loop in the same 1.1s.
- Fallbacks: no IntersectionObserver or reduced motion → no
  .reveal-ready class, everything renders final-state, no hidden
  content risk. Verified fallback path in code review.
- Hover depth (hover-capable pointers only): panels/profile card
  lift -3px + deeper shadow; repo rows translateX(3px) + shadow.

## Verification
- Real wheel-scroll test in headless Chromium with the owner's real
  payloads (Fetch-intercept mock): at load 0 panels inview, fills
  scaleX(0), score text 0; after scrolling: 5/5 panels inview, ring
  inview, score counted to 80, fills scaleX(1).
- Test-harness lessons (not app bugs): clear localStorage BEFORE
  enabling Fetch interception, or an ETag cached from a previous
  origin/run pairs with the mock and the app hangs; synthetic
  window.scrollTo + captureBeyondViewport screenshots do not drive
  IO the way real wheel input does in this headless build.
