---
name: close-gaps
description: >
  At the end of a working session (a Stop hook runs this) — or the moment you hit a
  gap mid-work — analyse where you lacked knowledge, a tool to validate your work as
  the project's real user, or a way to reach external systems, and close each gap by
  creating or improving one of three kinds of project skill: a docs skill, a
  validation-tool skill, or an external-context tool skill.
---

# Close gaps

When you finish work, look back and ask: **what knowledge did I have to re-derive,
what couldn't I validate the way the project's real user would, and what external
system did I struggle to reach?** Close each gap by creating or improving a skill in
the project's `.claude/skills/` (never global). Do it yourself — don't ask permission,
don't fake validation with a proxy (build / lint / typecheck / unit tests all pass
while the real thing is broken), and improve a near-match before adding a new one. The
*one* thing you may need from the user is a credential for an external-context tool (#3).

There are three kinds of skill to create.

## 1. Docs skill — knowledge

A skill whose SKILL.md is an **index (a table of contents)** of documents. The index is
always loaded (it's the skill's description + TOC), so the knowledge is always *known*;
each document is read on demand. This is how a project's knowledge — how to use its
libraries, its conventions, the gotchas you hit — grows without bloating context.

**The anchor docs skill is `project-overview`** — every project gets one: what the
project does, where code lives in the folder structure, how to run / build / test it,
and its core dependencies. Write its description so a fresh session loads it first
("Read at the start of any task in this project"); it's the orientation the agent
always picks up. A wrong or missing overview is itself a knowledge gap, so every
session corrects and extends it — it converges to accurate over time.

```markdown
---
name: <domain>-docs
description: Knowledge about <domain>. Load before assuming how <domain> works or researching it.
---
# <Domain>
| doc | covers |
|-----|--------|
| token-refresh.md | the 401 retry gotcha + the working pattern |
| webhooks → docs.vendor.com/webhooks (not captured yet) | signature verification + retry semantics |
```

- One docs skill per domain (a library, a subsystem, a workflow); each entry is a `<topic>.md` file beside the SKILL.md.
- Each doc captures the version, the gotcha, and the working pattern — what a future run needs, not this run's transient state.
- Record *where* external docs live (canonical URL / changelog) so the source can be re-fetched, not just your distilled summary.
- Note the neighbours you didn't need: when a source covers topics adjacent to the task, add a TOC row for each as a *forward reference* — the topic plus where to retrieve it (URL / section), without writing its `<topic>.md` yet. The index then records what *could* be pulled in later, so the next run finds it from the TOC instead of re-discovering the source. Keep these to genuinely adjacent topics with a real pointer — don't fabricate stubs or mirror a whole external TOC.
- A single fact can stay inline in the SKILL.md; split into docs + a TOC once it grows past a few. (`project-overview` usually starts inline and grows a TOC as the project does.)
- Update an existing doc or row rather than duplicating.
- Keep `project-overview` current: whenever the structure, dependencies, or purpose differ from what it says, fix it — the gap healing itself.

## 2. Validation-tool skill — proof from the user's side

A skill wrapping a **generic CLI** that drives the project's real interface (UI,
command, endpoint, public API) so you can confirm a result the way its consumer would —
the only real proof. Build a reusable *surface*, not a hardcoded one-off check; the
SKILL.md documents how to drive it.

```markdown
---
name: drive-<app>
description: Drive <app> as its real user to validate behaviour end-to-end. Use to confirm a change works.
---
# Drive <app>
A CLI that exercises the real interface — grow it, don't write one-off checks.
`node drive.mjs <cmd>`:  navigate <url> | click <sel> | read <sel> | assert <sel> <text>
e.g.  navigate / && click "#inc" && assert "#count" "1"
```

- Make it generic (verbs / flags) so every future check is a new *invocation*, not a new script.
- The interface dictates the tool: a browser driver for a UI, a curl wrapper for an endpoint, a script that imports and exercises a library's public API.
- Grow the CLI by adding commands as new surfaces appear, and document each in the SKILL.md.
- No way to drive the real interface yet? Building this IS the work — do it before claiming done.
- Keep the tool in the skill folder so it ships with the project; reuse the project's own dependencies rather than bundling.

## 3. External-context tool skill — reach outside the project

A skill wrapping a **CLI/API** that reads or operates on an external system the project
depends on — a database, an issue tracker, a third-party API, a cloud service — so the
next run queries it directly instead of re-deriving the access path. Like the
validation tool it's a generic surface, usually built over an existing CLI (`gh`,
`psql`, a vendor CLI) or a thin wrapper on the API.

```markdown
---
name: <system>-context
description: Query/operate <system> (e.g. the issue tracker, the prod read-replica). Needs <ENV_VAR>. Use to pull external context instead of guessing.
---
# <System>
Wraps `<cli>` to reach <system>. Auth: set `<ENV_VAR>` (the user provides it).
`<cli> <cmd>`:  list <filter> | get <id> | query "<read-only request>"
e.g.  list "label:bug state:open"
```

- Build on the system's existing CLI/API; don't reinvent it. Keep the surface generic and grow it.
- **Auth is the user's to give — this is the one gap you can't close alone.** Read credentials from an env var, never hardcode or commit them. If the credential is missing, stop and ask the user for it (a secret only they have), and name the exact env var in the SKILL.md.
- Default to read-only / least privilege; make any write or destructive command explicit and obvious.
- Note the auth scope, plus any rate limits or cost, so the next run doesn't trip them.

**Report at the end:** name each skill you created or improved, or say in one line that there was nothing durable.
