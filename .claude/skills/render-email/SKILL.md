---
name: render-email
description: Render any member notice email (payment receipt, fee change) from real @stottemedlem/email source with NO dev server, D1, Resend or send, and see it the way the member does: the envelope (subject, reply-to, attachments), the text/plain body, and the HTML body as a PNG. Use for any change to notice copy, subject lines, layout or attachments.
---
# Render a member notice

`node .claude/skills/render-email/render.mjs <notice> [flags]`

Notices: `receipt-join`, `receipt-renewal`, `receipt-no-card` (no card PNG could
be drawn), `receipt-bare-org` (no orgnr, no contact address, no member name),
`fee-change-up`, `fee-change-down`. `--list` prints them.

| flag | does |
|------|------|
| `--set key=value` | override any builder field, repeatable. Values are JSON when parseable: `--set paidNok=1200`, `--set memberName=null`, `--set tierName="Gull"` |
| `--card <file.png>` | attach a real card PNG (base64 from the file) instead of the stub |
| `--html <out.html>` | where to write the HTML body (default: a temp dir, path printed) |
| `--png <out.png>` | also shoot the HTML body with `preview-screenshot`, then Read the PNG |
| `--width` / `--height` | viewport for the PNG (default 700×900) |

```
node .claude/skills/render-email/render.mjs receipt-join --png /tmp/r.png
node .claude/skills/render-email/render.mjs receipt-renewal --set paidNok=1200
```

## Why this and not a unit test

`vitest` proves a string is present; it cannot show that two blocks of copy
compete, that a subject line is unreadable in an inbox list, or that a
paragraph sits in the wrong order. Read the PNG and the text body: an email has
two bodies and mail clients show either one, so check both.

## Notes

- Runs the `.ts` sources directly through Node's built-in type stripping (Node
  22.18+/24). No build, no `tsx`, no install. `pnpm install` is NOT needed.
- The fixtures are deliberately fictional (Bakvendtland Skolekorps, Kari Nordmann);
  keep real org and member data out of anything committed.
- Nothing is sent. There is no Resend key in play and no network call.
- Adding a notice kind to `packages/email`? Add a fixture to `FIXTURES` in
  `render.mjs` and a row above, so the next session can see it too.
