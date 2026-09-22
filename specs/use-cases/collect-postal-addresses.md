# Use case: Collect postal addresses

**Status:** Draft
**Solves:** [Problem: Loyalty is invisible and word of mouth goes untracked](../problems/invisible-loyalty-and-word-of-mouth.md)

## Goal
An organization gets its supporting members' postal addresses without asking
each member one at a time, so that the printed
[member cards](../concepts/member-card.md) and anything else physical can be
sent to them, and an organization that has nothing to post can decline to
hold addresses at all.

## Why this exists
[Member data](../concepts/member-data.md) is deliberately the smallest set
that lets an organization keep a list and reach the people on it, and a
postal address was researched and left out: nothing needed it, and asking
the payment provider for it makes sharing it a condition of joining. Printing
the cards changed the first half of that. A stack of cards is meant for
envelopes, and an organization that has to look up eighty addresses by hand
will not send them. Every organization gets those cards, so the product asks
for the address from the start rather than waiting for each organization to
discover the need. The second half still holds, which is why the supporter is
always told what the address is for, and why an organization can opt out.

## Actors
- **Organization administrator** may opt out, or replace the standard reason
  with their own words.
- **Supporting member** shares an address when joining.

## Preconditions
- The organization has accepted the current
  [data processing agreement](../concepts/data-processing-agreement.md),
  which names the postal address as something the product holds on its
  behalf unless the organization has opted out.

## Behaviour
1. **By default the organization asks for a postal address**, and the
   supporter is told why in a standard sentence: so that the member card can
   be sent in the post. Nothing has to be set up for this.
2. In the organization's settings the administrator can **write their own
   reason** in place of the standard one, and that is what their supporters
   read instead. The reason is never empty: without one of the organization's
   own, the standard sentence stands.
3. In the same place the administrator can **opt out**. From then on the
   organization's supporters are not asked for an address, the join page and
   the privacy notice go back to naming three details, and the address fields
   are no longer offered anywhere. Addresses already held stay with the
   members they belong to until the member or the organization removes them,
   or retention does. Opting back in is the same switch.
4. The [join page](../concepts/join-page.md) tells supporters, before they
   leave for the payment app, that the organization asks for their postal
   address, and quotes the reason. The privacy notice says the same.
5. A supporter who then joins shares their address the same way they share
   their name: from their payment-provider profile, with their consent, once,
   at joining. The address is kept as its parts, street, postal code, place
   and country, not as one line of text, so it can be put on an envelope
   and read back reliably.
6. **This happens at joining only.** A member who joined before the product
   asked has no address, and so does one whose profile held none: the
   provider cannot be asked again after the fact, and the product does not
   try, backfill, or offer a button to fetch it. An administrator can type or
   correct an address from the member's page in the back office, the way any
   other detail is corrected.
7. The address travels with the rest of the member's details: it is shown
   on the member's page in the back office, exported with the
   [member list](export-member-list.md), printed under each card on the
   [card sheets](print-member-cards.md), erased with the person
   ([erase a member's personal data](erase-member-data.md)), and let go by
   the same retention rule as the name.

## Acceptance criteria
- [ ] A new organization asks supporters for an address without any setting
      being touched, and its join page and privacy notice quote the standard
      reason.
- [ ] An organization can replace the standard reason with its own words,
      and that is what the join page and the privacy notice quote.
- [ ] An organization that has opted out never asks a supporter for an
      address, and its join page and privacy notice name only name, e-mail
      address and phone number.
- [ ] A supporter joining an organization that asks shares their address
      from their profile, and it is recorded as street, postal code, place
      and country.
- [ ] An administrator can correct a member's address from the member's page
      in the back office, and nothing in the product fetches an address after
      joining.
- [ ] An erased member holds no postal address.
- [ ] Opting out stops the asking without removing what was already given.

## Out of scope
- A date of birth or a national identity number: not collected, for the
  reasons in [member data](../concepts/member-data.md).
- Validating that an address exists, or looking one up from a postal code.
- The product posting anything itself.
- Fetching an address after joining, from the payment provider or anyone
  else, and any way for a member to enter one themselves.

## Related
- [Concept: Member data](../concepts/member-data.md): what is collected and
  why the address is asked for by default
- [Concept: Organization](../concepts/organization.md): where the choice is
  made
- [Concept: Join page](../concepts/join-page.md): where the supporter is told
- [Use case: Print the member cards](print-member-cards.md): the need that
  brought this about
- [Use case: Curate the member list](curate-member-list.md): the
  administrator's way of correcting it
