# Design — DevMetric

**Direction (v2, 2026-11-11):** GitHub-native product look. Dark ink
header + hero (solid `#0A0C10`) over a light data surface — dark where
the brand speaks, light where the numbers are read. One accent:
GitHub green. Solid colours only: no gradients, no glass, no glow.
Component language adapted from the patterns Wadi supplied (UI
Layouts library ledger + frontend-preferences): hero anatomy
(brand mark, bold two-line display title, supporting line, feature
chips), stat tiles and grouped panels from the interface-patterns
notes, skeleton shaped like the real UI, 8pt spacing, one filled
primary button per view.

**Tokens (as used in styles.css):**
- `--bg: #F4F5F3` · `--surface: #FFFFFF` · `--surface-alt: #EBEDEA`
- `--ink: #0A0C10` · `--ink-2: #12161D` · `--text: #16181D`
- `--text-on-ink: #E6EDF3` · `--text-muted: #596068` · `--muted-on-ink: #9BA7B1`
- `--border: #D9DCD6` · `--border-strong: #C4C8C0`
- `--accent: #2EA043` · `--accent-bright: #56D364` · `--accent-dark: #14632A` · `--accent-soft: #E7F4EA`
- `--danger: #B3261E` · `--warning-bg: #FFF4D6` · `--focus: #1A56C4`
- `--radius: 14px` · `--radius-lg: 18px` · layered soft shadows (never a white glow)

**Typography:** Sora (display: brand + hero + panel titles), Inter
(UI/body — this site's own pairing, chosen over the anti-tell list's
default-font warning by pairing it with Sora + JetBrains Mono),
JetBrains Mono (numbers, usernames, repo meta, quota line). Fluid
`clamp()` sizes throughout; body ≥ 15px; tap targets ≥ 44px
(Analyse button 50px).

**Component states:**
- Quota line: mono, normal / low (≤5 remaining, turns danger red).
- Settings: collapsed `<details>` so the token field never dominates; status line confirms saved/cleared.
- Try chips: one-tap sample usernames (recognition over recall).
- Skeleton profile with a soft pulse while loading (disabled under reduced motion); 404 empty state; error state with retry; offline banner.
- Language bars animate width on render (transition removed under `prefers-reduced-motion`); percentage always also shown as text.
- Footprint panel: three accent-soft highlight tiles — the signature numbers get the Von Restorff slot.

**Responsive:** fluid clamp() type + spacing; profile card wraps
under the avatar; stat tiles grid 5 → auto-fit → 2 columns; language
rows compress at 560px; search stacks full-width on phones. Verified
at 414px and 1280px with the full analysis rendered (no horizontal
overflow at either width).

**Brand mark:** bars-chart logo (three ascending bars = metrics),
drawn as inline SVG, reused as the favicon.
