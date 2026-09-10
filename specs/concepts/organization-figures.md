# Concept: Organization figures

**Status:** Draft

## Definition
The **organization figures** are the handful of numbers that answer "how are we
doing?" for one [organization](organization.md): what a year of support is
worth, how many people stand behind it, and how the
[annual period](annual-period.md) running now is going. They are the first
thing the front page of the [back office](back-office.md) says, and they are
counted from the register itself, never entered or kept anywhere.

The figures are:

| Figure | What it says |
|--------|--------------|
| **Yearly support** | What a year is worth if every running arrangement renews at today's prices |
| **Current supporting members** | How many are current for this period, and how many of those continue into the next |
| **Paid this period** | What has come in for the period running now, and what has come in ever |
| **New this period** | How many paid for their very first period |
| **Stopped this period** | How many ended their arrangement while this period ran, and did not start another |
| **Lapsed** | How many supported before and are not with us for this period |

## Why it exists
An administrator is a volunteer who comes back to the back office a few times a
year, and the question they arrive with is almost never about one person. It is
"can we count on this next year", "did more people join than left", "is it
worth what we hoped". The register answers that one member at a time, which is
not an answer: counting a hundred rows by hand is exactly the work the product
exists to remove.

**Yearly support is the figure the organization plans with.** A budget is set
before the money arrives, so what matters is not what was collected last year
but what the arrangements still running are worth over a year at today's
prices. Everything else on the page is there to say whether that number is
growing or leaking.

**New and stopped are one question asked twice**, which is why they are stated
side by side. A year in which twenty people joined reads as a good year until
it is put next to the twenty-two who left, and the organization that can see
both is the one that can do something while the period is still running.

## Rules & invariants
- **Every figure is derived, and none can be set.** They are counted from the
  [memberships](membership.md) that were paid for and the arrangements that are
  still running. There is nothing to edit here and nothing to correct: a wrong
  figure means a wrong register, and the register is where it is put right.
- **Yearly support counts a person, not an arrangement.** A supporter can hold
  more than one arrangement over time, and briefly two at once
  ([membership](membership.md)), so only their newest running one is counted.
  Counting arrangements would let one supporter's rejoin read as a second
  membership's worth of money.
- **Yearly support uses the membership's price today**, not the price the
  arrangement was made at. It is a statement about the year ahead, so it is
  worth what the organization now asks for. The
  [annual fee](annual-fee.md) rules still decide what any single member is
  actually charged at their next renewal, and a member who has not yet been
  told about a rise pays the price they know: for one period, the money that
  arrives can be less than this figure promises.
- **An arrangement that has been ended is not in it.** Those are precisely the
  memberships the organization must not count on, whether the supporter ended
  it themselves or the payment provider did. This is why the per-membership
  figure counts running arrangements and not members: somebody who has ended
  theirs is still a member for the rest of the period they paid for, and
  counting them beside a yearly amount would promise money that is not coming.
- **What is current is one number across the whole back office.** The count of
  current supporting members is the same number the member tab carries on every
  screen ([back office](back-office.md)); the front page and the chrome can
  never disagree about how many members there are.
- **Stopping is counted per person, and only when they are really gone.**
  Somebody who ends one arrangement and starts another has not stopped
  supporting, whatever the record says: rejoining is a stop and a start on the
  same day ([membership](membership.md)), so anybody whose support still runs
  is not counted as having stopped. Several arrangements of one person's ending
  in the same period is still one person leaving.
- **Stopping and lapsing are different, and both are worth saying.** Stopping
  is something a supporter did during this period, and they usually remain a
  member until the period they paid for runs out. Lapsing is a period that
  simply was not paid for. The first is this period's news; the second is the
  standing backlog of people worth inviting back.
- **The figures are read, not compared.** They are stated as numbers with the
  sentence that says what each one counts, never as a chart: six headline
  figures carry no shape worth drawing, and a picture of them would say less
  than the numbers do.
- **Every figure is always shown, including a new organization's zeroes.** A
  zero is an answer, and it is the answer the organization has come to change:
  the figures are the same five from the first day, so an administrator learns
  where each one lives before there is anything in it, and watches the same
  places fill up. A front page that grows sections as an organization succeeds
  would teach it twice.
- **Nothing here is an action or a way in.** Like the rest of the front page,
  the figures are shown and not followed by a button: the place that owns the
  members is a tab away on every screen.
- **Money is whole kroner**, written the way the rest of the product writes an
  amount, so a figure and a membership price read as the same kind of thing.

## Relationships
- Counted from [memberships](membership.md) and the arrangements behind them,
  per [annual period](annual-period.md).
- Shown on the front page of the [back office](back-office.md). They are what
  that page is for: the [membership](membership-tier.md) offer is not repeated
  there, because it has a place of its own that every screen links to.
- What a single member's own standing is called belongs to
  [Curate the member list](../use-cases/curate-member-list.md); these figures
  never name anybody.

## Referenced by
- [Concept: Back office](back-office.md)
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
