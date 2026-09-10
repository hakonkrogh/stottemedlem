---
name: workos-context
description: Ask WorkOS who may act for an organization, from the CLI: administrators, their memberships and sign-in state, and the invitations still pending. Needs WORKOS_API_KEY (the user's to give). Use when debugging back-office access ("why can't they get in", "did that invitation arrive"), or before trusting an assumption about an org's people, instead of asking the user to open the WorkOS dashboard.
---

# WorkOS context (who may act for an organization)

WorkOS is the authority on back-office access (`specs/concepts/administrator.md`):
the product stores no copy of who administers an organization, so the only way to
answer a question about it is to ask WorkOS. This wraps the REST API with `fetch`,
not the SDK, so it needs no build and cannot trip over `cloudflare:workers`.

`node .claude/skills/workos-context/workos.mjs <command> [args] [--flags]`

| command | does |
|---------|------|
| `orgs` (default) | every organization in the environment: id, created date, name |
| `admins <org>` | memberships joined to the user records: status, email, name, user id |
| `invites <org> [--state=pending]` | invitations: state, email, sent, expires, invitation id |
| `user <email\|user_id>` | one person, their sign-in state, and every org they belong to |
| `raw "<path>?<query>"` | any other endpoint, as JSON (`--compact` for one line) |

`<org>` is an `org_…` id or a case-insensitive part of the organization's name.

```
node .claude/skills/workos-context/workos.mjs admins bakvendtland
node .claude/skills/workos-context/workos.mjs invites org_01ab --state=pending
node .claude/skills/workos-context/workos.mjs user kari@example.org
```

## Auth (the one thing only the user can give)

The script reads `WORKOS_API_KEY` from, in order: the env var,
`~/.config/stottemedlem/workos-api-key` (one line, user-global so every worktree
shares it, like `cloud-logs`' token), then `apps/backoffice/.dev.vars`. It prints
these instructions when it finds none. Keys come from dashboard.workos.com under
API Keys.

**Keys are per WorkOS ENVIRONMENT.** A dev/staging key cannot see production's
people, and asking it about a production org id answers 404, which reads exactly
like "that org does not exist". Know which environment your key is for before
concluding anything. A fresh worktree's `.dev.vars` is a copy of
`.dev.vars.example`, whose `WORKOS_API_KEY` is empty, so this falls through to
the setup message rather than to a wrong answer.

## Read-only on purpose

There is no invite, revoke or delete command, and there should not be: sending an
invitation emails a real person, and revoking one takes real access away. Those
belong in the product, where they are audited and answered on screen
(`/o/<slug>/administratorer`, `specs/use-cases/manage-administrators.md`). If a
future run genuinely needs a write, add it as an explicit, obviously-named command
rather than a flag on a read.

`raw` is read-only too: it only ever issues GET.

## The output holds real people

Names, email addresses and organization names come back unredacted. That is fine
in the terminal and never fine in a commit, a spec, a story fixture or a
screenshot: the repo has one invented organization for all of those
(`Bakvendtland Skolekorps`, see the `writing-rules` skill).

## Rate limits

The User Management endpoints allow generous per-minute bursts and every listing
here is one request with `limit=100`, so ordinary use is nowhere near a limit. An
organization with more than 100 administrators or invitations would need
pagination (`after=` on the listing endpoints via `raw`); the product has no such
organization.

The API surface these commands are built on, and how to find more of it in the
installed SDK's types, is written up in `stack-docs` under "WorkOS on Cloudflare
Workers".
