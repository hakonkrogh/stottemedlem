# Use case: Ask for early access

**Status:** Active
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization that wants to start collecting supporting members can get in
touch and be let in, while the product is still taking organizations on one at
a time rather than letting anyone sign up on their own.

## Actors
- **Prospective organization**: usually one volunteer reading the front page on
  behalf of a band, choir, team or club.
- **The product's own people**, who answer and help the organization get set
  up.

## Preconditions
- The organization has not signed up yet. It has no
  [back office](../concepts/back-office.md) and no
  [join page](../concepts/join-page.md).

## Behaviour
1. The **front page states where the product stands: it is open for early
   access.** It does not say "coming soon". The two say almost the same thing
   about the calendar, but they ask for very different things: "coming soon"
   asks a visitor to remember us and come back later, which nobody does, and it
   leaves a reader who is ready today with nothing to do. Early access asks for
   something they can do while they are still on the page.
2. **Getting in touch is the one action the page asks for.** It is offered
   twice: in the first screen, beside the way into the rest of the page, and
   again at the end, after the reader has seen what the product does. A reader
   who is convinced by the headline should not have to scroll to act, and a
   reader who needed the whole page should not have to scroll back.
3. **Reaching us is a plain message to the product's own address**, with what
   it is about already filled in. There is no form, no queue with a position in
   it, and no account to create: at this stage the answer is written by a
   person anyway, so a form would only stand between the two of them. The
   address is written the way it is read, ø and all, both in the link and on
   the page: one address, so nobody wonders whether they got the right one.
4. **The page says what happens next**: we take a few organizations at a time,
   we get back in touch, and we help the organization get started. Someone
   giving us their address deserves to know whether they are joining a list or
   starting a conversation, and the honest answer is the second.
5. **Nothing else about the page changes.** It still explains the product
   before it asks for anything, and it still shows a real
   [QR card](promote-with-qr-card.md) so a prospective organization can see
   what it would get. The invitation is the page's conclusion, not its
   substitute.

## Acceptance criteria
- [ ] The front page nowhere claims the product is merely coming soon.
- [ ] A visitor can act on their interest from the first screen, without
      scrolling and without reading further.
- [ ] The same invitation appears again at the end of the page.
- [ ] Choosing it opens a message to the product's own contact address, already
      addressed and titled, in whatever mail program the visitor uses.
- [ ] The address in the link is the same readable address the page shows, with
      the ø, not an encoded form of it.
- [ ] The page tells the reader that a person will answer and help them start.

## Out of scope
- Signing up an organization from the marketing site. Creating an organization
  is [Set up a supporting membership](set-up-supporting-membership.md), and it
  begins after we have answered.
- A waitlist the visitor can watch: no queue, no position, no automatic mail
  back.
- Collecting name, organization or telephone number in a form on the page.
- Invite codes or any gate on the product itself. What is limited is how many
  organizations we take on at a time, and that is managed by us answering, not
  by the software.

## Related
- [Use case: Set up a supporting membership](set-up-supporting-membership.md):
  what happens once an organization is let in.
- [Use case: Promote membership with a QR code card](promote-with-qr-card.md):
  the front page's card preview, which this invitation follows.
- [Concept: Organization](../concepts/organization.md)
- [Concept: Brand attribution](../concepts/brand-attribution.md): the front
  page is the surface the attribution points at.
