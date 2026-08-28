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
- **Mobile-Safari-SPECIFIC behaviour cannot be verified on this machine**
  (found 2026-08-28 fixing the "page opens scrolled down under the status bar
  when arriving from Vipps/an email app" bug): Chrome emulation only fakes the
  viewport size, not WebKit's toolbar-collapse/visual-viewport quirks, and
  `xcrun simctl` HANGS INDEFINITELY here (no usable CoreSimulator; kill it,
  don't wait). For such fixes, validate the layout/script landed via shot.sh +
  `curl | grep`, then say plainly that the real proof is the user opening the
  staging URL from the actual app handoff on their phone. Playwright's bundled
  WebKit is NOT installed and downloads a browser — don't reach for it without
  asking.
- Typical loop (marketing, static): `pnpm turbo build --filter=@stottemedlem/marketing
  && pnpm --filter @stottemedlem/marketing preview --port 4399 &` → shot → Read →
  iterate. (astro preview serves `dist/` live, so rebuild + reload is enough;
  kill via `lsof -ti:4399 | xargs kill` when done.) Build via **turbo**, not a
  bare `--filter … build`: marketing imports workspace pkg `@stottemedlem/core`,
  which must build first — bare filter fails with "Rolldown failed to resolve
  import @stottemedlem/core". Fresh worktrees also need `pnpm install` first
  (node_modules is not shared across worktrees).
- Backoffice/UI loop (SSR app is auth-gated): don't fight the login wall — use
  Storybook in packages/ui. **In a fresh worktree, run
  `pnpm turbo build --filter=@stottemedlem/core --filter=@stottemedlem/db`
  BEFORE starting Storybook**: backoffice screen stories import workspace
  packages (`storyFixtures.ts` → `@stottemedlem/core`; screens also import
  `@stottemedlem/db`), and without a package's dist every backoffice story
  errors — "Failed to fetch dynamically imported module", or a red "Failed to
  resolve entry for package \"@stottemedlem/db\"" story box (primitives still
  render, so it looks story-specific). Building afterwards does NOT heal it —
  Vite keeps serving the failed resolution; kill and restart Storybook (hit
  2026-08-28, again with db 2026-08-28).
  `pnpm --filter @stottemedlem/ui run storybook --ci`
  (port 6006, ready in seconds, hot-reloads), then shoot a story's iframe URL
  directly: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`.
  Story ids slugify title + export: "Primitives/Button" + `Primary` →
  `primitives-button--primary`; "Backoffice/Opprett organisasjon" + `WithError`
  → `backoffice-opprett-organisasjon--with-error`. Stop with `lsof -ti:6006 |
  xargs kill`. If the astro dev server is needed instead (port 4322): it's a
  persistent daemon — "already running" may be a stale one from another session
  serving old code; `pnpm --filter @stottemedlem/backoffice exec astro dev stop`
  then restart, and stop it the same way when done. A stale daemon can also
  belong to a DIFFERENT worktree: `astro dev stop` then says "No dev server is
  running" while 4322 still answers with the other worktree's code — just start
  yours and read the port it actually got. In a fresh worktree the daemon dies
  with only "Dev server process exited before becoming ready" — the real error
  (e.g. `Failed to resolve entry for package "@stottemedlem/core"` … then
  `/log`, one unbuilt workspace dep at a time) is in `devlog.sh tail`; fix all
  at once with `pnpm turbo build --filter='@stottemedlem/backoffice^...'`
  (hit 2026-08-28). The dark pill at the bottom
  of astro-dev screenshots is Astro's dev toolbar, not the page.
- **Reviewing the org back office**: every screen has a story that renders
  inside the real tab chrome (`StoryScreen` wraps `OrgScreen`), and every
  in-app link is rewritten to the story behind it
  (`apps/backoffice/src/components/storyFixtures.ts` holds the path→story-id
  map). So the whole tabbed back office is **clickable in Storybook** — start at
  `iframe.html?viewMode=story&id=backoffice-oversikt--default` and click through
  tabs, edit buttons and back links; no dev server, login or D1 needed. Add a
  route to that map whenever a screen gains a new link, or it goes dead (`#`).
- **Inspecting a story's DOM (not just its pixels)** — e.g. proving a link
  points where you think: Storybook renders client-side, so `curl` returns the
  empty shell. Use Chrome's DOM dump with a LONG budget (a short one returns the
  shell and looks like a bug):
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new
  --disable-gpu --virtual-time-budget=20000 --dump-dom "<iframe url>" | grep -o
  'href="[^"]*"'`. List every story id with
  `curl -s localhost:6006/index.json | python3 -c "import json,sys;
  print('\n'.join(sorted(json.load(sys.stdin)['entries'])))"` — cheaper and
  surer than guessing the title→id slug (Norwegian letters slugify oddly; keep
  new story titles/exports ASCII). Note `playwright` is NOT an installed
  package — `import { chromium } from "playwright"` fails; only the `npx
  playwright screenshot` CLI path works.
- **PUBLIC backoffice pages** (`/bli-medlem/<slug>`, `/bli-medlem/<slug>/vilkar`, `/api/qr/*`)
  need no login and no `.dev.vars` — screenshoot them against `astro dev`
  directly. Pages that read D1 need the local DB prepared first (from
  `apps/backoffice`, shares `.wrangler/state` with astro dev):
  `pnpm exec wrangler d1 migrations apply DB --local`. **Use
  `bash .claude/skills/verify-public-routes/seed.sh [slug]` to seed** — it
  writes the org AND its `membership_tiers` rows. Seeding by hand from an
  `organizations` INSERT alone gives a *zero-tier degraded* page (since
  2026-08-19 `organizations.annual_fee_nok` is LEGACY/unused and the offer
  comes from `membership_tiers`), so the screenshot silently shows the wrong
  baseline — this doc's old hand-rolled seed had exactly that bug.
  Gotcha if you do seed by hand anyway: `workos_org_id` is NOT NULL UNIQUE, and
  omitting it makes the INSERT fail with no visible error in the tail'd output
  — append a `; SELECT ...` to the same --command to prove the row landed.
  Astro dev may come up on a DIFFERENT port than 4322 (another worktree's
  daemon holds it; vite logs "Port 4322 is in use, trying another one") — read
  the port from the start/logs output before shooting.
  Local R2 shares the same `.wrangler/state`. **Seed org logo + banner with
  `bash .claude/skills/verify-public-routes/seed-images.sh [slug]`** (generates
  fixture PNGs, uploads, sets the hashed keys — the whole recipe below,
  scripted). By hand:
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
- **Storybook serves Astro component `<script>` blocks UNTRANSPILED** (found
  2026-08-28 validating the member-list search): a TS generic like
  `querySelectorAll<HTMLElement>(...)` reaches the browser verbatim, where it
  parses as COMPARISON OPERATORS (`qsa < HTMLElement > ("...")` → `false`) —
  no syntax error, the line just yields garbage silently, while generic-free
  lines in the same handler work. The real app (astro dev/build) transpiles
  correctly, so the breakage is Storybook-only — but Storybook is the
  validation loop, so **write component `<script>`s in plain JS with
  `instanceof` narrowing** (`if (!(el instanceof HTMLElement)) continue;`)
  instead of TS generics; `astro check` is equally happy. Related timing rule:
  the script module runs BEFORE the story's DOM mounts, so top-level
  `querySelector` wiring finds nothing in Storybook — use event DELEGATION on
  `document` (works in both worlds). And Vite can serve a STALE script after
  an edit even to a fresh browser — `curl` the script URL (listed in
  `document.scripts`) to confirm the served version before debugging it;
  restart Storybook if stale. To drive interactions (type, click, then assert
  DOM state) use the puppeteer-core recipe below against the story iframe.
- **`<noscript>` styles APPLY inside Storybook stories** (same session): story
  markup is inserted client-side, so a `<style is:inline>` inside `<noscript>`
  becomes live CSS and (e.g.) hides the element it was meant to hide only for
  no-JS visitors — the element measures 0×0 while computed `display` still
  reads normal (the parent is what collapsed). Don't use noscript-hide
  patterns in screens that must be reviewable in Storybook.
- **Storybook compiles Astro `<style>` blocks UNSCOPED** (community
  `@storybook-astro`, seen 2026-08-25): the markup keeps its `data-astro-cid`
  attributes but the injected CSS has plain selectors, so one component's
  element rules leak onto every story — TextField's `input { width: 100%;
  display: block }` and `label { font-weight: 600 }` turned another screen's
  radio into a full-width block and bolded its labels. The real app (astro
  dev/build) scopes correctly, so the breakage is Storybook-only — but
  Storybook is the visual loop for auth-gated screens, so it still blocks
  sign-off. Fix by styling form elements explicitly by class in the screen
  (width/height/font on the input, font-weight/size on the label); see
  `.audience-choice input` in `ComposeMessageScreen.astro`. Corollary: don't
  *rely* on another component's leaked styles looking right in a story.
- **Debugging a story that only looks wrong:** `chrome --dump-dom` races the
  async story render (returns the skeleton even with `--virtual-time-budget`).
  `npm i puppeteer-core` in the scratchpad and drive the installed Chrome
  (`executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google
  Chrome"`), `waitForSelector` on your class, then read `getBoundingClientRect`
  + `getComputedStyle` — that is how the leaked `input{width:100%}` above was
  found in minutes after screenshots alone went in circles. Also: HMR can
  serve stale component CSS to shot.sh's fresh Chrome profile inconsistently —
  measure computed styles before trusting a weird screenshot after an edit.
- **Dark full-page "An error occurred" overlay in an astro-dev screenshot may
  not be about the URL you shot.** Vite broadcasts any SSR error to every
  connected page over the HMR websocket as a full-screen overlay — e.g. a
  browser's automatic `/favicon.ico` request 500ing paints the overlay onto a
  page that itself returned 200 (curl the URL to see the real response). Check
  `astro dev logs` for which request actually threw before debugging the page
  (the `dev-logs` skill wraps this: `bash .claude/skills/dev-logs/devlog.sh
  tail|grep` — and its `start` makes a foreground server's logs readable).
