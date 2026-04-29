# Feed WAVE — Teaser

Self-contained 18-second cinematic teaser for [github.com/saslan/wave](https://github.com/saslan/wave). Designed in Claude Design (claude.ai/design), implemented as a single static HTML file.

## What it is

- **18 s · 16:9 (1920×1080)** cinematic loop, autoplay.
- 5-scene story arc:
  1. **0 – 3.7 s** — Awakening. Neural web pulses → "A wave is rising." → "the feed · is · awake".
  2. **3.7 – 7.4 s** — Solana logo fades in, hands off to the Feed WAVE logo with a draw-on path. "feedwave / the social layer of solana".
  3. **7.4 – 11 s** — Mystery: italic "Are the whales / ready?" with gradient text reveal.
  4. **11 – 14.6 s** — Reveal: $WAVE chip, letter-cascade "COMING SOON", "private round · whitelist opens soon".
  5. **14.6 – 18 s** — Outro: WAVE × Solana logos, "save · the · date / Q3 2026", x.com/feedwaveio + t.me/feedwave pills.
- Ambient drifting blobs, animated wave floor, neural network nodes, vignette + film grain.
- Persistent corner marks: "feedwave" wordmark top-left, "built on Solana" top-right.

## Controls

- **Space** — play/pause
- **←/→** — seek 0.1 s (Shift+arrow for 1 s)
- **0 or Home** — jump to start
- Click/scrub the playback bar at the bottom

## Publish to GitHub Pages

1. Push `index.html` to the `main` branch of `github.com/saslan/wave`.
2. Repo → **Settings → Pages → Source → Deploy from branch → main / root → Save.**
3. After ~1 minute, the page is live at `https://saslan.github.io/wave/` (or your custom domain).

## Local preview

```bash
cd /Users/serkanaslan/Desktop/Projeler/feedwave/landing
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or open `index.html` directly in a browser.

## Recording for X / social

The teaser autoplays and loops at 1920×1080. To capture as a video:

- **macOS:** QuickTime → File → New Screen Recording → record the full-bleed canvas. Or use `ffmpeg` against an open browser window.
- **Headless:** Puppeteer + `ffmpeg` for a pixel-perfect 60fps capture (script not included; ask the dev to add).

Recommended export for X: 1280×720, H.264, < 60s, < 512 MB.

## Tech

Single HTML file, ~33 KB. Uses React 18 + Babel-Standalone via CDN to compile JSX inline — zero build step. CDN integrity hashes pinned. Brand fonts (Geist, Instrument Serif, Geist Mono) loaded from Google Fonts.

## Customization quick refs

- **Brand gradient stops** — `#06b6d4 → #3b82f6 → #8b5cf6` (cyan → blue → violet). Search and replace these hex values to retheme.
- **Solana stripes** — `#00FFA3 / #03E1FF / #DC1FFF`.
- **Scene timings** — Each scene is a `<window.Sprite start={...} end={...}>`. Edit the start/end in any `Scene*` function to retime.
- **Date** — `Q3 2026` text in `Scene5`. Search "Q3 2026" to replace.
- **Socials** — `Scene5` has the `x.com/feedwaveio` and `t.me/feedwave` pills. Edit URLs and labels there.
- **Total duration** — The `<window.Stage duration={18} />` value at the bottom; also adjust the last scene's `end` if you change this.

## Source

Originally exported from Claude Design (`feed-wave/project/Feed WAVE Teaser.html` + `animations.jsx` + `scenes.jsx` + `brand.css`). Inlined into a single self-contained HTML file for static hosting.
