---
name: drive-page
description: Click, fill, read and assert on a real page in headless Chrome — the proof that INTERACTIVE behaviour works (share buttons, forms, filter links, client scripts), which typecheck, vitest and preview-screenshot all pass while it is broken. Use whenever a change adds or touches anything a visitor has to click or that runs client-side JS.
---

# Drive a page as a visitor

    node .claude/skills/drive-page/drive.mjs <url> [flags] <step>...

Exits 0 when every `assert` passed, 1 on the first failure (`--keep-going` to
run them all). Needs a dev server — start one with `dev-logs`' `devlog.sh start`
and seed local D1 first (`verify-public-routes/seed.sh`).

## Steps — one argv token each, `verb=arg` or `verb=arg::arg2`

| step | does |
|------|------|
| `goto=<url>` | navigate again (the first URL is the positional arg) |
| `click=<sel>` · `fill=<sel>::<text>` · `press=<sel>::<key>` | act |
| `wait=<sel>` · `sleep=<ms>` | wait for a selector / a delay |
| `read=<sel>` · `attr=<sel>::<name>` · `count=<sel>` | print text / attribute / match count |
| `assert=<sel>::<text>` | substring match; PASS/FAIL and the exit code |
| `eval=<js>` | run in the page, print the result as JSON |
| `shot=<path>` · `url=` | full-page PNG / current URL |

## Flags

`--mobile` (390x844) · `--viewport WxH` · `--permissions clipboard-read,clipboard-write`
· `--stub '<js>'` (repeatable) · `--console` · `--keep-going`

**`--stub` is the important one.** Headless Chrome has no share sheet, no
Vipps, no phone — so stub the API and assert what the page asked it for.

## Worked example: the member card's share action

Both branches of `MemberCardFigure.astro`, proven end to end (2026-08-31):

    # A phone with a share sheet: the page must call it and NOT navigate away.
    node .claude/skills/drive-page/drive.mjs \
      "http://localhost:4322/bli-medlem/bakvendtland-skolekorps/min-side?n=tok-seed-1" \
      --mobile \
      --stub 'window.__shared=null; Object.defineProperty(navigator,"share",{value:d=>{window.__shared=d;return Promise.resolve()},configurable:true})' \
      click='a[data-share]' eval='window.__shared' url=

    # A desktop without one: falls back to the clipboard and says so.
    node .claude/skills/drive-page/drive.mjs \
      "http://localhost:4322/bli-medlem/bakvendtland-skolekorps/min-side?n=tok-seed-1" \
      --permissions clipboard-read,clipboard-write \
      --stub 'Object.defineProperty(navigator,"share",{value:undefined,configurable:true})' \
      click='a[data-share]' sleep=300 \
      eval='navigator.clipboard.readText()' \
      assert='[data-share-label]::Lenke kopiert'

## Gotchas

- **Playwright is not a workspace dependency.** The script imports it, resolving
  it from npm's `_npx` cache (where `preview-screenshot`'s `npx -y playwright`
  leaves it). If it reports the package missing, run `npx -y playwright --version`
  once, then retry. Never hardcode a `_npx/<hash>/` path — the hash changes.
- `channel: "chrome"` drives the installed Google Chrome; no browser download.
- **This is Chrome, so it proves logic, never mobile Safari.** WebKit's
  toolbar/visual-viewport quirks are unreachable here — see `preview-screenshot`
  for that whole sad story.
- An auth-gated `/o/<slug>/…` page will just redirect to `/login`; drive the
  PUBLIC surfaces (`/bli-medlem/*`, `/medlemsbevis/*`), or review an admin
  screen in Storybook instead.
- **A form MECHANISM that only admin pages exercise (a POST that 303s to
  another page, a rejected save that re-renders) can be proved with a scratch
  route** (done 2026-09-08 for `LiveForms`): two throwaway pages under
  `apps/backoffice/src/pages/bli-medlem/<name>/` (the public prefix, so no
  login), one posting and redirecting to the other. Three traps: a directory
  starting with `_` is NOT a route (Astro ignores it, 404), the dev server
  needs a `devlog.sh stop` + `start` to see new route files, and a bare curl
  POST answers 403 (Astro's origin check), so drive it from the browser.
  Delete the pages afterwards, and rebuild if a build ran while they existed.
- **Driving an admin screen in Storybook (done 2026-09-09 for the member
  list's payment-reference search):** start it with
  `cd packages/ui && pnpm exec storybook dev -p 6006 --ci --no-open` in the
  background and READ THE LOG for the port: when another checkout already
  holds 6006, Storybook silently moves to 6007 while 6006 keeps answering
  200 with the OTHER worktree's code. Story URLs are
  `http://localhost:<port>/iframe.html?id=<title-slug>--<story-slug>&viewMode=story`
  (`Backoffice/Medlem` + `FoundByPaymentReference` =
  `backoffice-medlem--found-by-payment-reference`). Every `href` a screen
  renders is rewritten by `StoryScreen` through `STORY_ROUTES` in
  `storyFixtures.ts`, unknown ones to `#`, so `attr=a::href` never shows
  the real address. To prove a link is composed right, add its exact
  path+query+hash to `STORY_ROUTES` and assert the href is that story's
  iframe URL: `#` means the composed address did not match.
- **A public scratch ENDPOINT proves a db query against seeded D1** (same
  day): a `.ts` route under `apps/backoffice/src/pages/bli-medlem/<name>/`
  exporting `GET` that calls the real `@stottemedlem/db` function for
  `org-seed-1` and returns JSON, curl-able with no login. Same three traps as
  the scratch pages above, and the dev server may come up on 4323 when 4322
  is taken; `devlog.sh start` prints the port.
- **A slow server is the case that matters for busy states.** Stub fetch to
  add a delay, then `shot=` mid-flight:
  `--stub 'const f=window.fetch; window.fetch=(...a)=>new Promise(r=>setTimeout(()=>r(f(...a)),1500))'`.

## Where this fits among the other loops

| loop | proves |
|------|--------|
| `drive-page` | what happens when a visitor **clicks** — client scripts, forms, redirects |
| `preview-screenshot` | what a page **looks like** at a given viewport |
| `verify-public-routes` | the HTTP contract — status, redirects, cache headers |
| `verify-qr` / `render-card` | the QR payload / the card artwork itself |
