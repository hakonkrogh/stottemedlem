---
name: writing-rules
description: Assert the user's hard authoring rules over the lines THIS session added (never an em-dash; every example organization is Bakvendtland, the repo's one invented org), across specs, docs, skills, stories and test fixtures. Run before finishing any session that wrote prose OR added an example organization; it catches what a repo-wide grep drowns and what `pnpm lint` never looks at.
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

## The rules it enforces

### 1. Never an em-dash

**Never an em-dash.** Not in replies, code comments, commit messages, PR
descriptions, docs, specs or UI text. Use a comma, a period, a colon or
parentheses. It is a hard user rule for every project, and nothing else in this
repo checks it: `pnpm lint` is biome over code, and `spec-lint` only validates
links and INDEX registration.

The other standing hard rule, **never the `any` type**, needs nothing here:
biome's `recommended: true` already includes `suspicious/noExplicitAny`, so
`pnpm lint` catches it. Don't duplicate it.

### 2. Every example organization is Bakvendtland

**One example organization, always the same one.** Fixtures, stories, seeds,
specs and docs name `Bakvendtland Skolekorps` (slug `bakvendtland-skolekorps`,
contact `post@bakvendtland.example`). Not a family of plausible placeholders:
one name, so a reader recognizes it instantly as the example and never has to
wonder whether this one happens to be somebody real.

`Bakvendtland` is Inger Hagerup's upside-down land, so it cannot be a real
place. That is the bar for a placeholder here: **unmistakably invented to a
Norwegian reader**, not merely plausible. A plausible-sounding name is exactly
what makes this leak invisible in review.

Vary only the **noun**, and only where a fixture's job is text fitting, so the
place-word still identifies it:

| fixture role | name |
|---|---|
| short, stays on one line | `Bakvendtland Korps` |
| the canonical org, wraps to two lines | `Bakvendtland Skolekorps` |
| two lines, second must not open with "og" | `Bakvendtland Korps og Ungdomsorkester` |
| three lines | `Bakvendtland Ungdomssymfoniorkester og Musikkforening` |
| longest, the identity header | `Bakvendtland og Omegn Skolekorps og Drilltropp` |

Member and person addresses (`kari@eksempel.example`) are people, not
organizations, and are out of scope. So is `eksempel` as the ordinary Norwegian
word.

**If the example org is ever renamed again**, two carriers do not show up in a
grep for the old name, and both were missed on the 2026-09-09 migration until a
screenshot and `pnpm lint` caught them:

- **Initials drawn into a fixture image.** `OrgIdentityHeader.fixtures.ts`
  draws the logo badge as inline SVG with the org's initials as `<text>`. The
  name changed and the badge still read `VM`. Grep the initials too, and look
  at a story that renders the logo.
- **Line length.** A longer slug pushed a `core/index.test.ts` line past
  biome's print width, so `pnpm lint` failed while every test passed. Run
  `pnpm exec biome check --write` over the changed files after a rename.

`ALLOWED` in `fictional-orgs.py` is therefore a single word. Only
**distinctive** words may ever be added: `Øvre` as an allowed word would pass
`Øvre <real band> Skolekorps`, which is the leak itself wearing a hat.

It is an **allow-list**: a deny-list of every real Norwegian band is
unwritable, and the leak this catches looked exactly like a placeholder. Names
are matched as the capitalized words before an organization noun
(`Skolekorps`, `Musikkorps`, `Idrettslag`, `Fotballklubb`, …) plus the little
connectors between them (`og`, `i`, `for`, …), so ordinary prose about "et
skolekorps" never trips it. Add nouns to `ORG_NOUN` as the fixtures grow.

The connectors are load-bearing: matching a run of capitalized words alone
starts `Bakvendtland og Omegn Skolekorps` at its second word and leaves the
word that identifies it as ours outside the match, so the repo's own
placeholder reports as a real name.

Why it is a rule at all: an example name does not stay in the test that wrote
it. Story fixtures render into committed Storybook screenshots, and the org
name flows into the member card, the receipt, and the public onboarding guide.
Naming a real band there publishes a claim about an organization we hold
nothing from. (The same instinct as the anonymization note at the top of
`docs/vipps-portal-walkthrough/README.md`.)

**Found the hard way 2026-09-09:** a real school band in Vestfold (the name is
in commit 5777cae, not repeated here, for the same reason the rule exists) sat
in `memberCard.test.ts` as the line-breaking fixture until the user spotted it
in a screenshot of the Vipps guide. Nothing flagged it: it is grammatical, it
looks invented, `pnpm lint` never reads fixture strings, and a repo-wide grep
had no way to tell it from the four other placeholder families the repo used
at the time. Pointing this pass at that commit
(`git diff --no-prefix -U0 5777cae^ 5777cae | python3 fictional-orgs.py`)
reports both of its lines, which is the regression test for the rule.

**Not checked, and left that way:** person names (`Kari Nordmann`,
`Anne-Margrethe Wollertsen Bjørnstad`) have no mechanical signal separating
invented from real, and org numbers already have a documented MOD11 placeholder
(`923609016`, see `verify-public-routes/seed.sh`). Don't add a rule that cannot
be decided from the line alone.

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
another pass behind the same entry point, plus a section above. Keep it
diff-scoped and keep the inherited-line distinction, or the output stops being
read.

`check-diff.sh` builds the added-line stream **once** into a temp file and runs
each rule over it, so a rule is a filter reading that diff on stdin and exiting
non-zero. Rule 1 is inline awk; rule 2 is `fictional-orgs.py`. **Reach for
python whenever the rule matches Norwegian text**: the awk here is
byte-oriented, so a bracket expression containing `Æ Ø Å` splits into bytes and
matches nonsense (that is why rule 2 is not in the awk pass).
