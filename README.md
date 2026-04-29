# Feed WAVE — Teaser

Next.js landing for [github.com/saslan/wave](https://github.com/saslan/wave). 18-second cinematic teaser, statically exported.

## Stack

- Next.js 15 (App Router)
- React 18, TypeScript
- Static export (`output: "export"`) — produces a plain `out/` folder, deployable to any static host (Hostinger, Netlify, Cloudflare Pages, GitHub Pages, …).

## Develop

```bash
npm install
npm run dev   # http://localhost:3000
```

## Build for production / deploy

```bash
npm install
npm run build
# → produces ./out/  (plain HTML/CSS/JS, no Node runtime needed)
```

Upload the contents of `out/` to your static host. For Hostinger:

- **Auto-deploy from Git:** the framework detector will recognize Next.js from `package.json` and run `next build`. Output dir: `out`.
- **Manual upload:** `npm run build` locally, then upload `out/` to `public_html/` via File Manager / FTP.

## Story arc (18 s · 16:9 · autoplay loop)

1. **0 – 3.7 s** — Awakening. Neural web pulses, "A wave is rising." → "the feed · is · awake".
2. **3.7 – 7.4 s** — Solana logo fades in, hands off to the Feed WAVE logo with a draw-on path. "feedwave / the social layer of solana".
3. **7.4 – 11 s** — Mystery: italic "Are the whales / ready?" with gradient reveal.
4. **11 – 14.6 s** — Reveal: $WAVE chip, letter-cascade "COMING SOON", "private round · whitelist opens soon".
5. **14.6 – 18 s** — Outro: WAVE × Solana logos, "save · the · date / Q3 2026", x.com/feedwaveio + t.me/feedwave pills.

Always-on: ambient drifting blobs, animated wave floor, neural network nodes, vignette + film grain, top-left "feedwave" wordmark, top-right "built on Solana" mark.

## Controls (during dev preview)

- **Space** — play/pause
- **←/→** — seek 0.1 s (Shift+arrow for 1 s)
- **0 / Home** — jump to start
- Click/scrub the playback bar at the bottom

## File structure

```
landing/
├── package.json
├── next.config.mjs           # output: "export", trailingSlash: true
├── tsconfig.json
├── .gitignore
└── app/
    ├── layout.tsx            # root <html>, fonts
    ├── globals.css           # body reset
    ├── page.tsx              # renders <Teaser/>
    └── teaser.tsx            # everything: Stage + Sprite + 5 scenes
```

## Customization quick refs

- **Brand gradient** — `#06b6d4 → #3b82f6 → #8b5cf6` (cyan → blue → violet). Search/replace.
- **Solana stripes** — `#00FFA3 / #03E1FF / #DC1FFF`.
- **Scene timings** — edit `<Sprite start={...} end={...}>` in each `Scene*` function in `app/teaser.tsx`.
- **Date** — `Q3 2026` in `Scene5`.
- **Socials** — `x.com/feedwaveio` and `t.me/feedwave` URLs in `Scene5`.
- **Total duration** — `<Stage duration={18}/>` in `Teaser` exported from `app/teaser.tsx`. Also adjust the last scene's `end` if you change this.

## Source

Originally exported from Claude Design (`feed-wave/project/Feed WAVE Teaser.html` + `animations.jsx` + `scenes.jsx` + `brand.css`). Ported to Next.js + TypeScript for static-host framework detection.
