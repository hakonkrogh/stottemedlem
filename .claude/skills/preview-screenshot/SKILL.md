---
name: preview-screenshot
description: Render any local URL (marketing/backoffice dev or preview server) to a PNG via headless Chrome, then Read the PNG to see it. THE visual validation loop for UI work in this repo — use it instead of asking the user for screenshots or relying on the claude-in-chrome extension (often disconnected).
---
# Preview screenshot

`bash .claude/skills/preview-screenshot/shot.sh <url> <out.png> [width] [height]`

- Writes the PNG (default 1440×1200) and prints its path; Read the PNG to view it.
- Save output PNGs to the session scratchpad, not the repo.
- Uses `/Applications/Google Chrome.app` with `--headless=new` — works with zero
  setup, no extension, no driver, no npm dependency.
- Full-page capture: pass a height taller than the page (e.g. 2600); excess
  height shows as body-background padding below the content.
- Responsive checks: `... 390 844` (mobile), `... 768 1024` (tablet), default desktop.
- Typical loop: `pnpm --filter @stottemedlem/marketing build && pnpm --filter
  @stottemedlem/marketing preview --port 4399 &` → shot → Read → iterate.
  (astro preview serves `dist/` live, so rebuild + reload is enough; kill via
  `lsof -ti:4399 | xargs kill` when done.)
