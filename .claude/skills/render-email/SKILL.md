---
name: render-email
description: Render any member notice email (payment receipt, fee change) from real @stottemedlem/email source with NO dev server, D1, Resend or send, and see it the way the member does: the envelope (subject, reply-to, attachments), the text/plain body, the HTML body as a PNG with the inline card shown, and the receipt PDF that rides along. Use for any change to notice copy, subject lines, layout, attachments or the PDF.
---
# Render a member notice

`node .claude/skills/render-email/render.mjs <notice> [flags]`

Notices: `receipt-join`, `receipt-renewal`, `receipt-no-card` (no card PNG could
be drawn), `receipt-no-pdf` (no receipt PDF could be made, so the facts are in
the body), `receipt-bare-org` (no orgnr, no contact address, no member name),
`fee-change-up`, `fee-change-down`, `org-signup` (the operator's "new
organization" mail, not a member notice). `--list` prints them.

| flag | does |
|------|------|
| `--set key=value` | override any builder field, repeatable. Values are JSON when parseable: `--set paidNok=1200`, `--set memberName=null`, `--set tierName="Gull"` |
| `--card <file.png>` | attach a real card PNG (base64 from the file) instead of the blank placeholder card. `render-card --raster` draws one |
| `--pdf <out.pdf>` | where to write the receipt PDF the sweep would attach (default: next to the HTML, path printed). Read it with the Read tool to see the page |
| `--no-pdf` | build the receipt as if no PDF could be made |
| `--html <out.html>` | where to write the HTML body (default: a temp dir, path printed) |
| `--png <out.png>` | also shoot the HTML body with `preview-screenshot`, then Read the PNG |
| `--width` / `--height` | viewport for the PNG (default 700×900) |

```
node .claude/skills/render-email/render.mjs receipt-join --png /tmp/r.png
node .claude/skills/render-email/render.mjs receipt-renewal --set paidNok=1200
node .claude/skills/render-email/render.mjs receipt-renewal \
  --card .card-preview/raster-card-WithLogo.png --png /tmp/r.png --pdf /tmp/r.pdf
```

The HTML body shows the attached card by content id (`cid:`), which only a
mail client resolves; the HTML written here has the same bytes inlined as a
data URI so the PNG shows the card where the member will see it.

## Why this and not a unit test

`vitest` proves a string is present; it cannot show that two blocks of copy
compete, that a subject line is unreadable in an inbox list, or that a
paragraph sits in the wrong order. Read the PNG and the text body: an email has
two bodies and mail clients show either one, so check both.

## Notes

- Runs the `.ts` sources directly through Node's built-in type stripping (Node
  22.18+/24). No build, no `tsx`. The sources import each other as `./x.js`,
  which type stripping does not rewrite, so the script registers a resolve
  hook that points such imports at the `.ts` file beside them. The receipt
  PDF needs `pdf-lib` from `node_modules`, so a fresh worktree needs
  `pnpm install --frozen-lockfile` once.
- The fixtures are deliberately fictional (Bakvendtland Skolekorps, Kari Nordmann);
  keep real org and member data out of anything committed.
- Nothing is sent. There is no Resend key in play and no network call.
- Adding a notice kind to `packages/email`? Add a fixture to `FIXTURES` in
  `render.mjs` and a row above, so the next session can see it too.

## What this cannot prove

The inline card is an attachment shown by `cid:`; this script inlines it as a
data URI for the PNG, so the screenshot proves layout, not that a real client
resolves the part. The only proof is a real send: run the receipt sweep
against staging with `RESEND_API_KEY` set (see `.dev.vars.example`) to an
address you can open in Gmail, Apple Mail and Outlook, and look for the card
shown in the body AND listed as `medlemsbevis.png` (2026-10-26: not yet done
for the inline card).
