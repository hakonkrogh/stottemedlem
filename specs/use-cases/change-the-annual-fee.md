# Use case: Change the annual fee

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization raises (or lowers) what a
[membership tier](../concepts/membership-tier.md) costs, and every supporting
member moves to the new price without anyone being charged a surprise.

## Actors
- **Organization administrator** — decides the new price.
- **Supporting member** — pays it from their next renewal.

## Preconditions
- The organization has at least one tier with an
  [annual fee](../concepts/annual-fee.md), and may have existing members on it.

## Behaviour
1. The administrator changes the tier's annual fee in the back office. It takes
   effect immediately for **anyone joining from now on**.
2. **Existing members move to the new price too.** The product does not keep
   old members on old prices: one tier means one current fee, so the
   organization can talk about "the membership fee" without qualification.
3. The change never touches a period already paid for. It takes effect at each
   member's **next renewal** — the turn of the
   [annual period](../concepts/annual-period.md) — and never mid-year.
4. A member who has already been told what their next renewal will cost is not
   charged something different. If the change comes too late to give that
   notice honestly, it applies from the following period instead.
5. **Members are told before the new price is charged.** The product owes them
   this — the payment provider announces an amount, not a change, and a
   supporting membership is a relationship, not a subscription trap.
6. A [lapsed](renew-annual-membership.md) member who comes back pays the fee
   current when they return, like any other new join.
7. What a member actually paid, in every year, stays recorded as it was. History
   is never restated to match the new price.

## Acceptance criteria
- [ ] Changing a tier's fee changes what new joins pay, immediately.
- [ ] Existing members on that tier are charged the new fee at their next
      renewal, and the amount they see in the payment app matches.
- [ ] No member is charged a new price for a period they already paid for.
- [ ] A change made too close to a renewal applies to the period after it,
      rather than surprising the member.
- [ ] Past memberships still show the fee that was actually paid.
- [ ] A returning lapsed member pays the current fee.

## Open questions
- **How members are told.** Deciding *that* they must be told is settled;
  *how* is not — the product sends nothing today, and
  [keeping supporters in the loop](keep-supporters-in-the-loop.md) is itself
  unbuilt. Until it exists, a fee change is honest only if the organization
  tells its members itself, and the product should say so plainly to the
  administrator making the change.
- **How much notice counts as enough**, and therefore where the cut-off before
  a renewal falls.

## Out of scope
- Different prices for different members of the same tier (grandfathering) —
  deliberately rejected: a tier has one current fee.
- Mid-period upgrades between tiers.

## Related
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Membership tier](../concepts/membership-tier.md)
- [Concept: Annual period](../concepts/annual-period.md)
- [Use case: Renew annual membership](renew-annual-membership.md)
