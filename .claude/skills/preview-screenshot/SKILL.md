---
name: preview-screenshot
description: Render any local URL (marketing/backoffice dev or preview server) to a PNG via headless Chrome, then Read the PNG to see it. THE visual validation loop for UI work in this repo — use it instead of asking the user for screenshots or relying on the claude-in-chrome extension (often disconnected).
---
# Preview screenshot

`bash .claude/skills/preview-screenshot/shot.sh <url> <out.png> [width] [height]`

- Writes the PNG (default 1440×1200) and prints its path; Read the PNG to view it.
- Save output PNGs to the session scratchpad, not the repo.
- Widths ≥ 500: uses `/Applications/Google Chrome.app` with `--headless=new` —
  zero setup, no npm dependency. The PNG is the viewport, so pass a height
  taller than the page (e.g. 2600) for a full-page capture; excess height shows
  as body-background padding below the content.
- Widths < 500 (mobile): macOS clamps Chrome windows to ≥500px even headless,
  so the script switches to `npx playwright screenshot --channel=chrome`
  (drives the installed Chrome; no browser download, npm package cached after
  first run) with true viewport emulation and `--full-page`. Two consequences:
  the PNG is always the whole page regardless of the height arg, and **a PNG
  wider than the requested width is proof of horizontal overflow** (check with
  `sips -g pixelWidth <png>`; equal widths = no overflow).
- Responsive checks: `... 375 812` (iPhone 12 mini), `... 390 844` (iPhone 14),
  `... 768 1024` (tablet), default desktop. Verify mobile PNGs' pixelWidth
  matches the requested width before judging the layout.
- Typical loop (marketing, static): `pnpm --filter @stottemedlem/marketing build
  && pnpm --filter @stottemedlem/marketing preview --port 4399 &` → shot → Read →
  iterate. (astro preview serves `dist/` live, so rebuild + reload is enough;
  kill via `lsof -ti:4399 | xargs kill` when done.)
- Backoffice/UI loop (SSR app is auth-gated): don't fight the login wall — use
  Storybook in packages/ui. `pnpm --filter @stottemedlem/ui run storybook --ci`
  (port 6006, ready in seconds, hot-reloads), then shoot a story's iframe URL
  directly: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`.
  Story ids slugify title + export: "Primitives/Button" + `Primary` →
  `primitives-button--primary`; "Backoffice/Opprett organisasjon" + `WithError`
  → `backoffice-opprett-organisasjon--with-error`. Stop with `lsof -ti:6006 |
  xargs kill`. If the astro dev server is needed instead (port 4322): it's a
  persistent daemon — "already running" may be a stale one from another session
  serving old code; `pnpm --filter @stottemedlem/backoffice exec astro dev stop`
  then restart, and stop it the same way when done. The dark pill at the bottom
  of astro-dev screenshots is Astro's dev toolbar, not the page.
