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
  as body-background padding below the content. **If shot.sh hangs >120s**
  (headless Chrome can wedge on launch even when the URL curls fine, seen
  2026-08-13): `pkill -f Chrome-headless`, then use the playwright path
  directly at ANY width — it works for desktop too:
  `npx playwright screenshot --channel=chrome --viewport-size=1440,900
  --full-page <url> <out.png>`.
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
- Typical loop (marketing, static): `pnpm turbo build --filter=@stottemedlem/marketing
  && pnpm --filter @stottemedlem/marketing preview --port 4399 &` → shot → Read →
  iterate. (astro preview serves `dist/` live, so rebuild + reload is enough;
  kill via `lsof -ti:4399 | xargs kill` when done.) Build via **turbo**, not a
  bare `--filter … build`: marketing imports workspace pkg `@stottemedlem/core`,
  which must build first — bare filter fails with "Rolldown failed to resolve
  import @stottemedlem/core". Fresh worktrees also need `pnpm install` first
  (node_modules is not shared across worktrees).
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
- **PUBLIC backoffice pages** (`/org/<slug>`, `/org/<slug>/vilkar`, `/api/qr/*`)
  need no login and no `.dev.vars` — screenshoot them against `astro dev`
  directly. Pages that read D1 need the local DB prepared first (from
  `apps/backoffice`, shares `.wrangler/state` with astro dev):
  `pnpm exec wrangler d1 migrations apply DB --local`, then seed with
  `pnpm exec wrangler d1 execute DB --local --command "INSERT INTO ..."`.
  Working minimal org seed (note `workos_org_id` is NOT NULL UNIQUE — omitting
  it makes the INSERT fail with no visible error in the tail'd output, so
  append a `; SELECT ...` to the same --command to prove the row landed):
  `INSERT INTO organizations (id, workos_org_id, slug, name, orgnr,
  contact_email, annual_fee_nok) VALUES ('org_test_1', 'workos_org_test_1',
  'eksempelkorpset', 'Eksempelkorpset', '999999999',
  'post@eksempelkorpset.no', 300); SELECT slug FROM organizations`.
  Astro dev may come up on a DIFFERENT port than 4322 (another worktree's
  daemon holds it; vite logs "Port 4322 is in use, trying another one") — read
  the port from the start/logs output before shooting.
  Local R2 shares the same `.wrangler/state`: seed org media with
  `pnpm exec wrangler r2 object put "stottemedlem-media/<key>" --file <img>
  --content-type image/jpeg --local` where `<key>` matches the row's
  `logo_key`/`banner_key` (format `org/<id>/<kind>-<sha256-first-16-hex>.<ext>`
  — compute with `shasum -a 256 <img> | cut -c1-16`; verified end-to-end
  2026-08-12). Seed only FICTITIOUS org names/orgnr — screenshots must never
  show real org data. Exercising the auth-gated settings POST (uploads) end-to-
  end still needs real WorkOS keys in `.dev.vars` — rendering-only checks go
  via Storybook as above. For an auth-gated page's CLIENT-SIDE `<script>`
  (e.g. the banner focal-point picker in `OrgImageFields.astro`), a workable
  fallback is a scratchpad HTML harness: copy the component's markup + CSS +
  script (TS generics stripped) into one file with a local test image, shoot
  it via `file://` — validates geometry/fade visually, but it's a COPY, so
  re-copy after editing the component (verified 2026-08-12).
- **Fresh-worktree wrangler ordering:** run `pnpm install` BEFORE any
  `npx wrangler … --local`. In a worktree without node_modules, npx fetches
  the LATEST wrangler, whose workerd writes a `.wrangler/state` schema the
  workspace-pinned wrangler then can't open (fatal
  `table _cf_ALARM has 3 columns but 2 values` on every later local command).
  Fix: `rm -rf apps/backoffice/.wrangler` and redo migrations/seeding with the
  workspace wrangler (hit 2026-08-12).
- **Dark full-page "An error occurred" overlay in an astro-dev screenshot may
  not be about the URL you shot.** Vite broadcasts any SSR error to every
  connected page over the HMR websocket as a full-screen overlay — e.g. a
  browser's automatic `/favicon.ico` request 500ing paints the overlay onto a
  page that itself returned 200 (curl the URL to see the real response). Check
  `astro dev logs` for which request actually threw before debugging the page
  (the `dev-logs` skill wraps this: `bash .claude/skills/dev-logs/devlog.sh
  tail|grep` — and its `start` makes a foreground server's logs readable).
