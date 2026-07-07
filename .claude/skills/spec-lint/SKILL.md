---
name: spec-lint
description: Validate the specs/ layer after editing it — every relative link resolves and every spec is registered in specs/INDEX.md. Run after adding or renaming any spec file.
---
# Spec lint

Run from the repo root:

```
node .claude/skills/spec-lint/check.mjs
```

Checks (templates `_TEMPLATE.md` are exempt):
- every relative `.md` link in `specs/**` resolves to an existing file;
- every spec file under `specs/problems|use-cases|concepts` appears in a
  registry table in `specs/INDEX.md` (matched as `(<relative-path>)`).

Exit code 0 = clean; non-zero prints each `FAIL` line. Grow this script if the
spec process gains new invariants (e.g. status values, required sections).
