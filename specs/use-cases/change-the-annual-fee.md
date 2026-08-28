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
1. The administrator changes the tier's annual fee in the back office.
   **Saving a fee change is a two-step act when anyone is affected**: before
   anything is stored, the administrator is told exactly how many existing
   members the product will email about the change — and that this cannot be
   opted out of, by the administrator or by the members. There are exactly two
   ways out: confirm, and the change and its notices go together; or cancel,
   and nothing changes at all. There is no way to change the price quietly —
   telling the members is half of what a price change *is*, and it is easy to
   forget that a saved number becomes an email to real people. A change that
   affects nobody (no members on the tier at that price) saves without the
   question.
2. Once confirmed, the change takes effect immediately for **anyone joining
   from now on**.
3. **Existing members move to the new price too.** The product does not keep
   old members on old prices: one tier means one current fee, so the
   organization can talk about "the membership fee" without qualification.
4. The change never touches a period already paid for. It takes effect at each
   member's **next renewal** — the turn of the
   [annual period](../concepts/annual-period.md) — and never mid-year.
5. **Members are told before the new price is charged**, by the product itself,
   as a [member notice](../concepts/member-notice.md). The product owes them
   this — the payment provider announces an amount, not a change, and a
   supporting membership is a relationship, not a subscription trap. The notice
   says what the fee was, what it becomes, when it first applies, and how to
   stop the membership if they would rather not pay it.
6. A member who has already been told what their next renewal will cost is not
   charged something different. **A new fee reaches a member's renewal only if
   they were told about it at least two weeks before that renewal payment is
   arranged.** A change that lands later than that is not cancelled — it simply
   applies from the following period, and the imminent renewal is taken at the
   price the member was last told. Two weeks is the product's answer to "enough
   notice": long enough to notice an email and act, short enough that an
   organization can still change its price in the autumn and have it count for
   the coming year.
7. A member the product has no way to reach cannot be told, and therefore never
   moves to the new price by surprise: they stay on the price they last
   knew about, and the organization is shown that it must reach them itself.
8. A [lapsed](renew-annual-membership.md) member who comes back pays the fee
   current when they return, like any other new join.
9. What a member actually paid, in every year, stays recorded as it was. History
   is never restated to match the new price.

## Acceptance criteria
- [ ] A fee change that affects existing members is never stored on the first
      press: the administrator first sees how many members will be emailed,
      that the email cannot be declined, and can only confirm or cancel the
      whole change.
- [ ] Cancelling at that point leaves everything exactly as it was — no new
      price, no emails.
- [ ] A fee change affecting nobody saves without the confirmation step.
- [ ] Changing a tier's fee changes what new joins pay, immediately.
- [ ] Existing members on that tier are charged the new fee at their next
      renewal, and the amount they see in the payment app matches.
- [ ] No member is charged a new price for a period they already paid for.
- [ ] A change made too close to a renewal applies to the period after it,
      rather than surprising the member.
- [ ] Every member on the tier is told about the change without the
      administrator having to write anything.
- [ ] A member is never charged an amount they were not told about at least two
      weeks earlier.
- [ ] The same change is never announced to the same member twice.
- [ ] The administrator can see who could not be reached, and is told plainly
      that reaching those members is theirs to do.
- [ ] Past memberships still show the fee that was actually paid.
- [ ] A returning lapsed member pays the current fee.

## Open questions
- **Members with no contact details.** They are excluded from the price change
  rather than surprised by it, which is the safe answer but not a good one: an
  organization could end up with members it can never reprice. Whether the
  product should eventually refuse to hold such a membership at all is not
  decided.

## Out of scope
- Different prices for different members of the same tier (grandfathering) —
  deliberately rejected: a tier has one current fee.
- Mid-period upgrades between tiers.

## Related
- [Concept: Annual fee](../concepts/annual-fee.md)
- [Concept: Member notice](../concepts/member-notice.md) — how the member is
  told, and why the telling is recorded
- [Concept: Membership tier](../concepts/membership-tier.md)
- [Concept: Annual period](../concepts/annual-period.md)
- [Use case: Renew annual membership](renew-annual-membership.md)
