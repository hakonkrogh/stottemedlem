---
name: writing-rules
description: Assert the user's hard authoring rules over the lines THIS session added (currently: never an em-dash), across specs, docs, skills and code comments. Run before finishing any session that wrote prose; it catches what a repo-wide grep drowns and what `pnpm lint` never looks at.
---

# Writing rules

    bash .claude/skills/writing-rules/check-diff.sh            # unstaged + staged vs HEAD, plus untracked files
    bash .claude/skills/writing-rules/check-diff.sh --staged   # staged only (pre-commit)
    bash .claude/skills/writing-rules/check-diff.sh HEAD~3     # the commits YOU made this session

Exit 1 with `file:line` per violation, so fixing is mechanical.

**Scope it to your own work, not to the branch.** The no-argument form is the
one to reach for. Passing a ref judges every added line since that ref, which on
a long-lived branch means judging other people's writing: pointing it at
`origin/main` before opening PR #86 produced 32 hits, none of them from this
session, because the branch carried 9 older commits that predate the rule.
`HEAD~<n>` over your own commits is the useful ref form (that same check passed
clean). Do not "fix" inherited violations you did not write.

## The rule it enforces

**Never an em-dash.** Not in replies, code comments, commit messages, PR
descriptions, docs, specs or UI text. Use a comma, a period, a colon or
parentheses. It is a hard user rule for every project, and nothing else in this
repo checks it: `pnpm lint` is biome over code, and `spec-lint` only validates
links and INDEX registration.

The other standing hard rule, **never the `any` type**, needs nothing here:
biome's `recommended: true` already includes `suspicious/noExplicitAny`, so
`pnpm lint` catches it. Don't duplicate it.

## Why it is diff-scoped

The repo's existing prose is full of em-dashes (it predates the rule, and the
user writes them freely). A repo-wide grep is therefore thousands of hits, gets
ignored, and the rule ends up unchecked. Only ADDED lines are the agent's own
writing, so only those are judged.

- **Untracked files are included**, faked in as fully-added. `git diff` cannot
  see a brand-new file, and a new `SKILL.md` or script is exactly the writing
  most likely to break the rule. Found the hard way 2026-09-08: a manual
  `git diff | grep` over one session's work reported clean while a new
  `trace-member.sh` sat there with five em-dashes in its comments.
- **A modified line reports as `(inherited, ...)` on stderr, and does not
  fail**, when a line removed in the same hunk also had an em-dash. Appending
  to an existing prose line otherwise reads as a fresh violation. Judge only
  your own added words there. This is a heuristic, not a parse: it cannot tell
  which words in a rewritten line are new.

## Gotcha that broke the first version

`--no-prefix` is load-bearing. This repo sets `diff.mnemonicPrefix`, so diff
headers read `+++ w/path` (working tree), not `+++ b/path`. Matching a literal
`b/` silently lost every filename and printed violations against an empty path.
Never parse a diff header assuming `a/`/`b/` without forcing the prefix.

## Grow it, don't one-off it

A new hard authoring rule that is mechanically checkable belongs here as
another test inside the same awk pass, plus a row above. Keep it diff-scoped
and keep the inherited-line distinction, or the output stops being read.
