#!/usr/bin/env bash
# Assert the authoring rules over the lines THIS session added:
#   1. never an em-dash;
#   2. every example organization name is one of the repo's invented ones.
#
# Diff-scoped on purpose. The repo's existing prose is full of em-dashes (it
# predates the rule, and the user writes them freely); a repo-wide grep is
# therefore all noise and gets ignored, which is how the rule stopped being
# checked at all. Only ADDED lines are the agent's own writing, and only those
# are judged.
#
#   bash .claude/skills/writing-rules/check-diff.sh            # unstaged + staged vs HEAD
#   bash .claude/skills/writing-rules/check-diff.sh --staged   # staged only (pre-commit)
#   bash .claude/skills/writing-rules/check-diff.sh <ref>      # everything since <ref>
#
# Exit 1 and print file:line for every violation, so the fix is mechanical.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# --no-prefix is load-bearing: this repo sets diff.mnemonicPrefix, so headers
# read "+++ w/path" (working tree) rather than "+++ b/path". Matching a literal
# "b/" silently lost every filename and reported violations against "" instead
# (found 2026-09-08). Forcing the prefix off makes the parse independent of the
# user's git config.
case "${1:-}" in
  --staged) DIFF=(git --no-pager diff --no-prefix --cached -U0) ;;
  "")       DIFF=(git --no-pager diff --no-prefix HEAD -U0) ;;
  *)        DIFF=(git --no-pager diff --no-prefix "$1" -U0) ;;
esac

# Untracked files are invisible to `git diff`, and a brand-new skill or doc is
# exactly the writing most likely to break the rule (found 2026-09-08: a new
# SKILL.md section shipped with four em-dashes). Add them as fully-added files.
UNTRACKED="$(git ls-files --others --exclude-standard)"

ADDED="$(mktemp -t writing-rules)"
trap 'rm -f "$ADDED"' EXIT

{
  "${DIFF[@]}"
  if [ -n "$UNTRACKED" ]; then
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      printf '+++ %s\n' "$f"
      # Fake a hunk header so the line numbering below counts from 1.
      printf '@@ -0,0 +1 @@\n'
      sed 's/^/+/' "$f"
    done <<< "$UNTRACKED"
  fi
} > "$ADDED"

status=0

awk '
  function has_dash(t) { return index(t, "\342\200\224") > 0 }

  /^\+\+\+ / { file = substr($0, 5); next }
  # -U0 keeps hunks tight, so the removed lines of a hunk are the very lines the
  # added ones replace. Remembering whether any of them already carried an
  # em-dash is what separates "I wrote this" from "I edited a line that already
  # had one" (appending to an existing prose line is otherwise a false alarm).
  /^@@ / { split($3, a, ","); line = substr(a[1], 2) + 0; inherited = 0; next }
  /^--- / { next }
  /^-/ { if (has_dash(substr($0, 2))) inherited = 1; next }
  /^\+/ {
    text = substr($0, 2)
    # An em-dash (U+2014). The user rule is absolute: use a comma, a period,
    # a colon or parentheses instead. Never in replies, code comments, commit
    # messages, PR descriptions, docs, specs or UI text.
    if (has_dash(text)) {
      if (inherited) warned[++w] = sprintf("%s:%d: (inherited, judge only your added words) %s", file, line, text)
      else           failed[++f] = sprintf("%s:%d: em-dash: %s", file, line, text)
    }
    line++
    next
  }
  { next }

  END {
    for (i = 1; i <= w; i++) print warned[i] > "/dev/stderr"
    for (i = 1; i <= f; i++) print failed[i]
    exit (f > 0)
  }
' "$ADDED" || {
  echo ""
  echo "Rule: never use em-dashes. Replace with a comma, period, colon or parentheses."
  status=1
}

# Rule 2 is its own pass, in python, because the names it matches are full of
# Norwegian letters and awk here is byte-oriented: a bracket expression with Æ
# Ø Å in it splits into bytes and matches nonsense.
python3 "$(dirname "${BASH_SOURCE[0]}")/fictional-orgs.py" < "$ADDED" || {
  echo ""
  echo "Rule: the repo has ONE example organization, Bakvendtland Skolekorps."
  echo "Vary the noun only where a fixture exercises text fitting (Bakvendtland"
  echo "Korps, Bakvendtland og Omegn Skolekorps og Drilltropp). See rule 2 in"
  echo "the skill's SKILL.md."
  status=1
}

[ "$status" -eq 0 ] || exit 1

echo "writing rules OK: no em-dashes, no real organization names, in added lines."
