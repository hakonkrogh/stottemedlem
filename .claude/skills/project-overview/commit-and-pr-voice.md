# The voice of a commit and a pull request here

This repo's history does not read like most. Nothing enforces it, no hook
checks it, and a session that has not looked at `git log` writes
"Add heart to QR codes" and is wrong on the first try every time. Read this
before writing a commit message or a PR body.

## The subject line is a sentence, not an instruction

It states **what is true of the product now**, in the present tense, as a
claim somebody could disagree with. It is not a description of the edit.

Real subjects from this history:

    The heart in the middle of a code is damage the code can afford
    A night that never happened is as loud as one that failed
    A card with no words on it is not a card, and now says so
    A member knows which one they were
    A notice says its address cannot be replied to
    The member's half of the card speaks up
    A saved price change reaches the server it was sent to

What none of them do: start with a verb in the imperative ("Add", "Fix",
"Update", "Refactor"), name a file, name a function, or carry a ticket
number or a conventional-commits prefix (`feat:`, `fix:`).

**Work that is not product behaviour takes a scope prefix** and may be plainer,
because there is no product truth to state:

    Skills: drive-page can hold a request back, and see a page waiting
    render-card: prove a rebase did not move the card
    project-overview: a cached package build from another worktree still counts

## The body is prose

Paragraphs, not bullets. There is no bulleted commit body anywhere in this
history. Each paragraph takes one idea and finishes it.

What the body is for, in rough order:

1. **The situation that made the change necessary**, stated as a problem a
   reader can feel. Not "the QR code did not have a heart" but what was wrong
   with that.
2. **The reasoning, including the part that constrains the solution.** Where a
   number was measured rather than picked, say what it was measured against.
   Where the standard or the platform had no opinion, say so.
3. **What it cost.** This history is unusually honest about tradeoffs: a
   regression that was accepted, an alternative that was measured and rejected
   and why. A body that only lists benefits does not match the voice.
4. **What had to be removed or reworked to make it true everywhere**, if
   anything. Half-applied changes get called out rather than glossed.

Write it so somebody reading the log in a year learns *why*, not *what*: the
diff already says what.

## Hard rules that also apply here

- **Never an em-dash**, in a commit message or a PR body, the same as
  everywhere else (see the `writing-rules` skill, which checks the files but
  cannot see your commit message).
- **Every example organization is Bakvendtland Skolekorps.**
- **The attribution lines** the session is told to use go at the end: a
  `Co-Authored-By:` trailer on the commit, and the generated-with line on the
  PR body. Take them verbatim from the session's own instructions rather than
  from here, since they name a model and change.

## A pull request body

Same voice, more structure. `##` headings are fine here (they are not in a
commit body), and a table earns its place when there are before/after numbers.
Lead with what is true now, then the reasoning, then the evidence: what was
run, what passed, and what a reviewer should look at twice. If the change
touched more than the ask implied, say so plainly in its own section and offer
the revert, rather than letting a reviewer discover it in the diff.

Specs reconciled in the same unit of work get their own short section, because
the harness requires them and a reviewer checks for them.
