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
      "http://localhost:4322/bli-medlem/eksempel-musikkorps/min-side?n=tok-seed-1" \
      --mobile \
      --stub 'window.__shared=null; Object.defineProperty(navigator,"share",{value:d=>{window.__shared=d;return Promise.resolve()},configurable:true})' \
      click='a[data-share]' eval='window.__shared' url=

    # A desktop without one: falls back to the clipboard and says so.
    node .claude/skills/drive-page/drive.mjs \
      "http://localhost:4322/bli-medlem/eksempel-musikkorps/min-side?n=tok-seed-1" \
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

## Where this fits among the other loops

| loop | proves |
|------|--------|
| `drive-page` | what happens when a visitor **clicks** — client scripts, forms, redirects |
| `preview-screenshot` | what a page **looks like** at a given viewport |
| `verify-public-routes` | the HTTP contract — status, redirects, cache headers |
| `verify-qr` / `render-card` | the QR payload / the card artwork itself |
