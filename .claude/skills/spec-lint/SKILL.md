---
name: spec-lint
description: Validate the specs/ layer after editing it: every relative link resolves, every spec is registered in specs/INDEX.md, and every spec path cited from code comments, skills and docs still exists. Run after adding or RENAMING any spec file, which is when the citations outside specs/ go stale.
---
# Spec lint

Run from the repo root:

```
node .claude/skills/spec-lint/check.mjs
```

Checks (templates `_TEMPLATE.md` are exempt):
- every relative `.md` link in `specs/**` resolves to an existing file;
- every spec file under `specs/problems|use-cases|concepts` appears in a
  registry table in `specs/INDEX.md` (matched as `(<relative-path>)`);
- every `specs/…md` path cited from OUTSIDE `specs/` still exists: code
  comments, skills and docs, over every tracked and untracked file git knows
  about.

Exit code 0 = clean; non-zero prints each `FAIL` line. Grow this script if the
spec process gains new invariants (e.g. status values, required sections).

## Why the third check exists

**Renaming a spec is the operation nothing else in this repo catches.** A code
comment citing `(specs/concepts/membership.md)` is how a reader gets from a
screen to the intent behind it, and it compiles just as well once that file has
been renamed away: biome never reads prose, `astro check` never reads comments,
and the link check above only looks inside `specs/`. Added 2026-09-10 after a one-day-old use case was
renamed and its path had to be chased through ten files by hand. Its first run
found two dead citations, one of them from that very rename in a directory the
grep had missed, and one months-old rot from stars becoming hearts.

So: rename a spec, then run this. Fixing what it prints is usually one
`sed -i ''` per file.
