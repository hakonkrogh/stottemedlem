#!/usr/bin/env python3
"""Assert that org names in ADDED lines are the repo's invented placeholders.

Reads the same unified diff check-diff.sh builds (on stdin), so it judges only
this session's writing. A real organization's name in a fixture, story or spec
is a leak: it reaches committed screenshots, Storybook, and the public-facing
onboarding guide, and it names a real band whose data we do not hold.

Allow-list, not deny-list, on purpose. A deny-list of real bands is unwritable;
the set of placeholder names the repo has agreed on is short and known. A new
placeholder is therefore a deliberate act: add its place-word here.
"""

import re
import sys

# The repo has exactly ONE example organization, and it is Bakvendtland. Only
# the noun after it varies, and only where a fixture exercises text fitting;
# the place-word never does. The SKILL.md beside this file lists the variants.
#
# It lists them, and this file does not, on purpose: a name spelled out here
# has to survive comment wrapping, and a wrapped one leaves a tail with no
# place-word in it, which this pass then reports against its own source.
#
# One name, not a set, because a reader recognizes it instantly as the example
# and never has to ask whether this one happens to be somebody real.
#
# Only DISTINCTIVE words belong here. A generic prefix ("Øvre", "Nedre",
# "Store") must never be allow-listed: it would wave through the exact leak
# this rule exists to catch, since prefixing a real band's name does not make
# it invented.
ALLOWED = {"bakvendtland"}

# The nouns a Norwegian voluntary organization's name ends in. A name is the
# capitalized words immediately before one of them.
ORG_NOUN = (
    r"(?:Skolekorps|Musikkorps|Ungdomskorps|Janitsjarkorps|Ungdomsorkester"
    r"|Symfoniorkester|Ungdomssymfoniorkester|Musikkforening|Musikklag"
    r"|Idrettslag|Idrettsforening|Fotballklubb|Håndballklubb|Turnforening"
    r"|Speidergruppe|Sanglag|Mannskor|Damekor|Kammerkor|Drilltropp|Korps)"
)
# The little words a Norwegian org name carries between its capitalized ones.
# They must be part of the match, not a boundary: "Vestbygda og Omegn
# Skolekorps" read as a capitalized run alone starts at "Omegn" and leaves the
# word that identifies it as ours outside the match, reporting the repo's own
# placeholder as a real name (hit 2026-09-09).
CONNECTOR = r"(?:og|i|for|på|ved|av|til)"
WORD = r"[A-ZÆØÅ][\w'’-]*"
NAME = re.compile(rf"{WORD}(?:\s+(?:{CONNECTOR}|{WORD})){{0,5}}\s+{ORG_NOUN}")


def offenders(text):
    """Names on this line that are not built from an allowed place-word."""
    found = []
    for match in NAME.finditer(text):
        words = {w.lower().strip("-") for w in match.group(0).split()}
        if not (words & ALLOWED):
            found.append(match.group(0))
    return found


def main():
    path = ""
    inherited = set()
    failures = []
    warnings = []
    line_no = 0

    for raw in sys.stdin.read().splitlines():
        if raw.startswith("+++ "):
            path = raw[4:]
            continue
        if raw.startswith("--- "):
            continue
        if raw.startswith("@@"):
            # -U0 keeps hunks tight, so a name on a removed line of this hunk is
            # one the added lines are rewriting, not one this session invented.
            head = raw.split()[2]
            line_no = int(head.split(",")[0][1:])
            inherited = set()
            continue
        if raw.startswith("-"):
            inherited.update(offenders(raw[1:]))
            continue
        if raw.startswith("+"):
            text = raw[1:]
            for name in offenders(text):
                where = f"{path}:{line_no}"
                if name in inherited:
                    warnings.append(f"{where}: (inherited) {name}")
                else:
                    failures.append(f"{where}: real-looking organization name: {name}")
            line_no += 1

    for warning in warnings:
        print(warning, file=sys.stderr)
    for failure in failures:
        print(failure)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
