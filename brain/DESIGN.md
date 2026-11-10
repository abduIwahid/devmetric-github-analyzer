# Design — DevMetric

**Direction:** terminal-ink header on white, one accent (GitHub green). Data-dense but calm; bars and stat blocks carry the visual weight, not decoration. Solid colours only.

**Tokens (as used in styles.css):**
- `--bg: #F6F7F5` · `--surface: #FFFFFF` · `--surface-alt: #ECEEEA`
- `--ink: #0D1117` · `--text: #1A1D21` · `--text-on-ink: #E6EDF3`
- `--text-muted: #5A6068` · `--border: #D5D9D2`
- `--accent: #1F883D` · `--accent-dark: #14632A`
- `--danger: #B3261E` · `--warning-bg: #FFF4D6` · `--focus: #1A56C4` · `--radius: 10px`

**Typography:** system stack — "Helvetica Neue", Helvetica, Arial, sans-serif. Numbers are large and bold in the stat grid; usernames wrap safely (`overflow-wrap: anywhere`).

**Component states:**
- Quota line: normal / low (≤5 remaining, turns danger red).
- Settings: collapsed `<details>` so the token field never dominates the page; status line confirms saved/cleared.
- Skeleton profile while loading; 404 empty state; error state with retry; offline banner.
- Language bars: track + fill divs, percentage always also shown as text (never colour-only information).

**Responsive:** profile card wraps under the avatar; stat grid flows; language rows compress at 480px.
