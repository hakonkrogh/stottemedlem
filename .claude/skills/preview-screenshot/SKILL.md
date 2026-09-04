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
  asking. Epilogue (2026-08-28): that bug's shipped-unproven fix (PR #55) was
  REVERTED — on a real phone it locked the page to the top. Known-bad pattern
  from it: a `pageshow` scroll-to-top (fires at load-complete, often seconds
  after the reader started scrolling, and `visualViewport.pageTop > 0` is true
  for ANY user scroll, so it yanks them back — and it's a no-op against the
  actual bug, where scrollY is already 0: the offset lives in WebKit's
  collapsed browser chrome, which no JS can expand). Research 2026-08-28
  (Apple forums thread 773770 + field reports): `viewport-fit=cover` and
  safe-area padding do NOT fix it; the one reported lever is body
  `min-height: 100lvh` (no flex, no JS) so even a short page has scroll range
  to snap the chrome back — reinstated CSS-only. On-device video (2026-08-28,
  iPhone Chrome, staging self-service page) then PROVED: the lvh range lets a
  manual scroll recover the top and nothing freezes, but the page still OPENS
  clipped, and #55's scrollTo(0,0) demonstrably did nothing (scrollY already
  0 — a no-op scroll doesn't re-seat the visual viewport). Next experiment
  shipped: an early (DOMContentLoaded + pageshow) `scrollTo(0,1); scrollTo(0,0)`
  nudge, guarded to bail after any touchstart or when scrollY > 0 so it can
  never yank a reader. On-device retest: the nudge did NOT cure the arrival
  clip either. When a mobile bug defies fixes like this, STOP guessing and
  instrument: PublicShell carries a staging-only
  (`SENTRY_ENVIRONMENT === "staging"`) `#vv-debug` overlay showing live
  scrollY / visualViewport pageTop/offsetTop/height / innerHeight /
  safe-area-top plus first-seconds timeline — ask the user for a screen
  recording and read the numbers off the frames. The overlay video SOLVED
  the diagnosis (2026-08-28, Proton Mail → Chrome iOS): ~150ms after load
  the LAYOUT viewport grows upward under the status bar (innerHeight
  683→757) with scrollY=0, pageTop=0, offsetTop=0 AND
  safe-area-inset-top=0 — no scroll offset exists anywhere, which is why
  every scroll-reset failed, and the default viewport-fit reports inset 0
  even while covering the status bar. Fix shipped from that data:
  `viewport-fit=cover` (makes the reported inset real) + main
  `padding-top: calc(3rem + env(safe-area-inset-top, 0px))` (absorbs
  exactly the covered area, 0 in the normal state), plus the nudge
  re-triggered on the real signature (innerHeight grew past its initial
  value) at 250–2000ms timers instead of DOMContentLoaded (which fires
  BEFORE the ~150ms growth). Third on-device video then DISPROVED both of
  those levers too: with viewport-fit=cover live, sat STILL read 0 while the
  viewport covered the status bar (WebKit's inset reporting lies in this
  state), and the programmatic scrollTo(0,1);scrollTo(0,0) dance visibly
  executed (scroll event at 257ms in the log) without re-seating the chrome
  — only a real finger drag does. The surviving approach (shipped): compute
  the covered area as the measured growth delta (innerHeight − initial
  innerHeight, clamped 20–120px) and apply it as `--sm-arrival-inset` top
  padding while untouched at scroll 0, withdrawing it only when innerHeight
  shrinks back. FIXED — fourth on-device video confirmed: heading below the
  status bar, pad 48→122 at ~150ms (the visualViewport resize listener
  catches the growth before the timers). The staging overlay is REMOVED from
  PublicShell; to instrument a future mobile mystery the same way, resurrect
  it from git history (search `vv-debug` in this file's log) and read the
  numbers off user screen-recording frames. To READ such a
  phone video: no ffmpeg here — dump frames with a Swift
  AVAssetImageGenerator script (see scratchpad pattern), then Read the PNGs.
- **Don't crop tall shots with `sips`** (hit 2026-09-01): `--cropOffset` silently
  does nothing in every flag order tried — the output keeps the full height while
  sips exits 0. For a page taller than one shot, just Read the full playwright
  `--full-page` PNG (legible up to ~4000px tall), or take a second viewport shot
  with a taller height arg via shot.sh.
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
  **A worktree copied from another worktree can carry a STALE VITE CACHE** (hit
  2026-09-04): Storybook answers 200 on `/` but `index.json` is
  `{"entries":{}}` and `iframe.html` is a 500 whose ENOENT names the OTHER
  worktree's path (`…/worktrees/<gone>/node_modules/.pnpm/@storybook+builder-vite…`).
  Neither a rebuild nor a restart heals it: `pkill -f "storybook dev -p <port>"`,
  `rm -rf packages/ui/node_modules/.cache packages/ui/node_modules/.vite`, start
  again, and confirm `index.json` lists story ids before shooting.
  Since 2026-08-31 the root alias `pnpm story` (= `pnpm stories`) does the
  core+db pre-build AND starts Storybook in one go; the manual form is
  `pnpm --filter @stottemedlem/ui run storybook --ci`
  (port 6006, ready in seconds, hot-reloads). **Start it with `nohup … &
  disown`, NOT with the Bash tool's `run_in_background`** (hit 2026-08-31):
  backgrounded that way the task reports "completed, exit 0" while the server
  is dead and every later curl returns `000`, which reads as "Storybook is
  broken" rather than "nothing is running". From `packages/ui`:
  `nohup pnpm exec storybook dev -p 6006 --ci --no-open --quiet > /tmp/sb.log 2>&1 &
  disown`, then poll `curl -so /dev/null -w '%{http_code}' localhost:6006`
  until it is 200 (about a second). **Keep `--ci` and expect 6006 to be taken
  by ANOTHER worktree's Storybook** (hit 2026-09-01): without `--ci` a busy
  port wedges the process on an interactive "use 6007 instead?" prompt, and
  meanwhile the OTHER instance answers your curl with 200 — its index.json
  serves that worktree's (or zero) stories, so the poll lies. Pick a unique
  port (e.g. 6016) and confirm index.json lists YOUR story ids before
  shooting. Then shoot a story's iframe URL
  directly: `http://localhost:6006/iframe.html?id=<story-id>&viewMode=story`.
  Running Storybook did NOT dirty `package.json` / `pnpm-lock.yaml`
  (hash-checked before and after, 2026-08-31) — but `verify-workflow` warns it
  can, so hash them yourself rather than trusting either claim before a push.
  **List the ids before shooting — do not derive them from the component
  name:** `curl -s localhost:6006/index.json | python3 -c "import json,sys;
  print('\n'.join(sorted(json.load(sys.stdin)['entries'])))"`. Story TITLES in
  this repo are Norwegian while the components are English, so the obvious
  guess is wrong: `MemberListScreen.stories.ts` is
  `backoffice-medlemsliste--default`, NOT `screens-memberlistscreen--default`
  (cost a wasted shot 2026-08-31, and a wrong id renders a "Couldn't find story
  matching" error page that looks like a broken build). Ids otherwise slugify
  title + export: "Primitives/Button" + `Primary` → `primitives-button--primary`;
  "Backoffice/Opprett organisasjon" + `WithError` →
  `backoffice-opprett-organisasjon--with-error`. **A playwright shot of a
  COLD story is a blank page or a lone spinner** (hit 2026-08-31): playwright
  shoots at `load`, but a first-visit story still compiles/fetches its module
  after that. Add `--wait-for-timeout=4000` (and re-shoot if still blank —
  a warm story then renders instantly); shot.sh's Chrome path avoids this via
  `--virtual-time-budget` but can hang instead (see above). Stop with `lsof -ti:6006 |
  xargs kill`. If the astro dev server is needed instead (port 4322): it's a
  persistent daemon — "already running" may be a stale one from another session
  serving old code; `pnpm --filter @stottemedlem/backoffice exec astro dev stop`
  then restart, and stop it the same way when done. The daemon takes its port
  from the app's `dev` script (marketing 4321, backoffice 4322): a `--port`
  appended to `pnpm dev` is ignored, so read the port from the "Dev server
  running at" line, and `npx astro dev stop` from the app dir stops it. Every
  playwright full-page shot of a dev-server page carries the Astro dev toolbar as
  a dark pill near the bottom of the viewport; it is not the page, and a built
  `astro preview` has none. A stale daemon can also
  belong to a DIFFERENT worktree: `astro dev stop` then says "No dev server is
  running" while 4322 still answers with the other worktree's code — just start
  yours and read the port it actually got. In a fresh worktree the daemon dies
  with only "Dev server process exited before becoming ready" — the real error
  (e.g. `Failed to resolve entry for package "@stottemedlem/core"` … then
  `/log`, one unbuilt workspace dep at a time) is in `devlog.sh tail`; fix all
  at once with `pnpm turbo build --filter='@stottemedlem/backoffice^...'`
  (hit 2026-08-28). The dark pill at the bottom
  of astro-dev screenshots is Astro's dev toolbar, not the page.
- **A component that pulls its content from a server endpoint cannot be
  reviewed in Storybook** — Storybook serves no app routes, so an
  `<img src="/medlemsbevis/…/kort.svg">` (MemberCardFigure) or
  `<img src="/api/qr/…">` renders a broken-image icon and proves nothing. When
  the content underneath is a PURE function, add a story-only wrapper that
  calls it and inlines the result: `MemberCardStory.astro` +
  `MemberCard.stories.ts` (`Backoffice/Medlemsbevis`) is the worked example —
  same function, same output, no server. Two things to carry over: the wrapper
  belongs beside the component with a "nothing in the app imports it" comment
  (the `StoryScreen.astro` precedent), and **a browser-drawn SVG is not
  pixel-identical to a resvg-rasterized one** (variable font weights apply in
  the browser, not in resvg — see qr-codes.md), so judge layout in Storybook
  and weight against the real PNG.
  **Still unreviewable this way:** the ORGANIZATION's QR card (`qrCardSvg`) has
  no story at all — it is reachable only through `/api/qr/<slug>` (dev server +
  a seeded org) or baked into the marketing page at build time. Same fix
  applies whenever someone needs to iterate on it.
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
  'href="[^"]*"'`. (Story ids come from `index.json` — see the listing command
  above; keep new story titles/exports ASCII.) Note `playwright` is NOT an installed
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
  The kvittering page's confirmed-payment states (member card + receipt on
  `/bli-medlem/<slug>/kvittering`) are unreachable this way even though the
  page is public: they need `getVippsForOrg` to return a client (real Vipps
  keys via WorkOS) AND a synced agreement, else `status` stays "unknown".
  The receipt slip has a story — `backoffice-kvittering--default` (+
  `--without-name`, `--long-values`), rendering the page's receipt block via
  the story-only `ReceiptPaperStory.astro` wrapper (keep it in step with the
  page). For the full page with a real agreement, use the vipps-test-rig.
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
