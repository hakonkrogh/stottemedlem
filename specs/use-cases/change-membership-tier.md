# Use case: Change membership tier

**Status:** Draft
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
A supporting member decides to give more — or less — to the organization they
already support, and moves to a different
[membership tier](../concepts/membership-tier.md) without leaving and joining
again.

## Actors
- **Supporting member** — decides what they want to give.
- **Organization** — offers the tiers, and is paid the new amount from the
  member's next renewal.

## Preconditions
- The member holds a running arrangement with the organization.
- The organization offers more than one tier. With a single tier there is
  nothing to change to, and nothing is said about changing.

## Behaviour
1. On [their own page](../concepts/member-self-service.md), a member whose
   membership still runs is shown the organization's other tiers, each with
   what it costs a year.
2. Choosing one moves the **existing arrangement** to that tier. The member
   does not leave and join again: the arrangement they already approved is
   kept, along with the address of their own page, and nothing is stopped or
   created. What they give changes; the relationship does not.
3. **No money moves now.** The period they have already paid for is theirs at
   the price they paid, and is never re-priced, topped up or partly refunded
   — the same promise every other [fee](../concepts/annual-fee.md) change
   makes ([changing the annual fee](change-the-annual-fee.md)). A member who
   wants to give more *this* period gives it outside the membership.
4. The new price applies **from their next renewal**, and the page says so
   before the choice is made and again after it.
5. **A member is charged the tier they chose.** Their own choice is what they
   know their price to be, from the moment they make it — the waiting period
   that protects a member from the organization's price changes does not
   delay a change the member asked for themselves. Without this a member who
   moved up a tier would be charged the old, lower amount for another period.
6. The change is recorded as something the member knows about their price, so
   the organization is never asked to tell them about a price they chose.
7. A member may change tier as often as they like, in either direction, and
   the newest choice is the one that counts.
8. A tier the organization no longer offers cannot be moved to, and "changing"
   to the tier already held does nothing.
9. The change is only real once the payment provider has accepted it. If it
   cannot be made, the member is told plainly and nothing about their
   membership has changed — they are still on the tier and the price they
   were on.
10. **A member who rejoins from the public page at a different tier** ends up
    on that tier, when the arrangement they just made is the one that
    survives ([joining](join-as-supporting-member.md)): they chose it, so it
    is theirs, and the choice is recorded the same way. Where instead their
    older arrangement is the one that keeps running, the tier is not changed
    from that — an accidental second join is not a considered decision — and
    their own page is where they change it deliberately.
11. What was paid, in every period, stays recorded as it was, under the tier
    it was paid for. Moving tiers never restates history.

## Acceptance criteria
- [ ] A member with a running membership, in an organization with more than
      one tier, is offered the other tiers on their own page, each with its
      annual price.
- [ ] An organization with one tier offers nothing to change to.
- [ ] A member whose membership has ended is not offered a tier change — they
      are offered the way back first.
- [ ] Choosing a tier keeps the same arrangement and the same page address:
      nothing is stopped, and no new arrangement is created.
- [ ] No payment is taken, raised or given back at the moment of the change.
- [ ] The member's next renewal is charged the new tier's price — including
      when the change was made days before that renewal was arranged.
- [ ] A member who moved up a tier is never charged the old, lower price for
      the following period.
- [ ] The organization is not asked to notify a member about a price that
      member chose.
- [ ] A tier the organization has archived cannot be moved to.
- [ ] When the payment provider refuses the change, the member is told, and
      their tier, price and arrangement are exactly as before.
- [ ] Periods already paid keep the tier and amount they were paid under.

## Relationships
- Changes which [membership tier](../concepts/membership-tier.md) an
  arrangement is for.
- Offered on the member's own
  [page](../concepts/member-self-service.md).
- Follows the same "next renewal, never mid-period" rule as
  [changing the annual fee](change-the-annual-fee.md), and is recorded as a
  [member notice](../concepts/member-notice.md).
- Reached accidentally from [joining](join-as-supporting-member.md), when a
  member rejoins at a different tier.
