# Use case: Erase a member's personal data

**Status:** Draft
**Solves:** [Problem: Keeping an accurate list of who has paid](../problems/keeping-an-accurate-member-list.md)

## Goal
A person who has supported an organization stops being a person in its
register — while the record of what they paid stays intact, so the
organization's numbers for a year it has already counted do not move.

## Actors
- **Supporting member** — asks for their own details to be removed, from their
  own membership page.
- **Organization administrator** — does it on the member's behalf, since a
  request from a member reaches the organization first.
- **The product itself** — does it unasked once the details have been kept as
  long as they may be (see [member data](../concepts/member-data.md)).

## Preconditions
- The member exists in the organization's register.
- Their yearly arrangement is **not running**. Someone still being charged
  cannot be erased out of the arrangement charging them.

## Behaviour

1. **From the member's own page.** The page that lets a member end their
   membership also offers, once it is ended, to remove their details. It says
   in advance what will happen: the details go, the payments stay without a
   name, the page stops working, their hearts are gone, and re-joining later
   means starting as a new member.
2. Choosing it asks once more, then removes the person: name, e-mail address,
   phone number, the payment provider's identifier for them, and every personal
   address they hold — their membership page and their member card both stop
   resolving.
3. The member is told it is done, on the spot. That confirmation is the last
   thing that address ever shows: the link died with the data, so the answer
   cannot be delivered by sending them somewhere.
4. **From the back office.** A member's page in the back office offers the same
   removal, as a quiet action rather than a prominent one, behind the same
   confirmation. If the member's arrangement is still running, the product
   refuses and says why — ending it is the member's own to do.
5. **By the calendar.** Without anyone asking, the product erases members whose
   details have been kept as long as the payment history that names them
   requires. This runs on its own, repeatedly and harmlessly: a member already
   erased is never erased again.
6. **Afterwards**, the member's row remains so the periods they paid for still
   count towards the organization's totals — shown as an erased member, never
   as a nameless one. Nothing about them can be edited, and the member list,
   the export and the back office all say the same thing about them.

## Acceptance criteria

- [ ] A member with a stopped arrangement can erase themselves from their own
      page, and sees a confirmation on that same response.
- [ ] After erasure, the member's own page and their member card both stop
      resolving, and no other member's page or card is affected.
- [ ] After erasure the member holds no name, e-mail, phone, provider
      identifier or personal address anywhere in the product.
- [ ] The periods they paid for, and the amounts, are unchanged by erasure —
      the organization's total for each year is the same before and after.
- [ ] Erasing a member whose arrangement is still running is refused, and the
      refusal explains that the arrangement must end first.
- [ ] An administrator can erase a member from the back office, behind a
      confirmation that states what is lost.
- [ ] An erased member reads as "erased" in the member list, on their own back
      office page, and in the export — never as a member with a missing name.
- [ ] The automatic sweep erases members past their retention, leaves everyone
      else untouched, and changes nothing when run twice.

## Out of scope
- Deleting the membership or payment rows themselves. The money is the
  organization's record of its own year and is kept as the books require.
- Erasing a member out of a running arrangement. Ending the arrangement comes
  first, and that is the member's to do (see
  [renew annual membership](renew-annual-membership.md)).
- Undoing an erasure, or recognizing a returning supporter as the same person.
  Both would require keeping exactly what was erased.
- Anything the payment provider holds about the same person. That is theirs,
  and the member asks them directly.

## Related
- [Concept: Member data](../concepts/member-data.md)
- [Concept: Supporting member](../concepts/supporting-member.md)
- [Concept: Member self-service page](../concepts/member-self-service.md)
- [Use case: Curate the member list](curate-member-list.md)
