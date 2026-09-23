# Use case: Sign up for early access

**Status:** Active
**Solves:** [Problem: Collecting annual support is manual and leaky](../problems/collecting-annual-support.md)

## Goal
An organization that wants to start collecting supporting members can create
its own organization in the product, today, while knowing that the product is
in an early access test phase, and is then guided all the way to taking its
first payment.

## Actors
- **Prospective organization**: usually one volunteer reading the front page on
  behalf of a band, choir, team or club.
- **The product's own people**, who learn that an organization has signed up
  and help it when it asks.

## Preconditions
- The organization has not signed up yet. It has no
  [back office](../concepts/back-office.md) and no
  [join page](../concepts/join-page.md).

## Behaviour
1. **The front page states where the product stands: it is open for early
   access.** It does not say "coming soon". "Coming soon" asks a visitor to
   remember us and come back later, which nobody does, and it leaves a reader
   who is ready today with nothing to do.
2. **Creating an organization is the one action the page asks for.** It is
   offered twice: in the first screen, beside the way into the rest of the
   page, and again at the end, after the reader has seen what the product does.
   A reader who is convinced by the headline should not have to scroll to act,
   and a reader who needed the whole page should not have to scroll back.
3. **The page says what early access means, in plain words, before anyone
   signs up:** the product is new and still changing, it is free while the
   test phase lasts, members pay with real money through the organization's own
   Vipps agreement, and the organization sets itself up with a step-by-step
   guide. It also gives the product's own address for anyone who gets stuck,
   written the way it is read, ø and all.
4. **The page still explains the product before it asks for anything.** It
   shows a real [QR card](promote-with-qr-card.md) so a prospective
   organization can see what it would get, and **a real
   [member card](../concepts/member-card.md)**, drawn the same way a member's
   own card is, for an invented member of the invented organization, with a
   few lines on what it means (a heart for each year, a card that recruits and
   credits the member who showed it, the year it is good for). An
   organization buys a membership its members will like having, and one real
   card says that better than a row of hearts and a description of a card the
   reader cannot see. Both cards' QR codes lead back to the front page. The
   invitation is the page's conclusion, not its substitute.
5. **The action leads straight to creating an account**, not to a sign-in
   screen that assumes one already exists. Someone who already has an account
   is taken to creating an organization.
6. **The create form says the same thing again, at the top**, before any field
   is filled in, and **asks the administrator to confirm it with a tick box**:
   empty until they tick it, next to the data processing agreement's box, and
   checked by the product as well as the browser. Leaving it unticked stops the
   creation and says why. An organization whose own members will pay through a
   test-phase product should have noticed that it is one.
7. **After creating the organization, the administrator is guided to the
   finished setup** by the front page's setup guide
   ([Set up a supporting membership](set-up-supporting-membership.md)).
8. **Every back-office screen quietly says "early access"**, with a way to ask
   the product's own people for help, so the promise made at sign-up stays in
   view and help is always one press away.
9. **The product's own people learn that an organization has signed up**, from
   the product's operational log, without anyone having to tell them. The line
   names the organization by its identifiers only.

## Acceptance criteria
- [ ] The front page nowhere claims the product is merely coming soon.
- [ ] A visitor can start creating an organization from the first screen,
      without scrolling and without reading further.
- [ ] The same action appears again at the end of the page.
- [ ] The front page says the product is in early access, that it is free while
      the test phase lasts, and that payments are real.
- [ ] The page shows a real member card for an invented member, next to a
      short explanation of what the card gives a member.
- [ ] The action opens the sign-up side of the sign-in; a signed-in visitor
      goes straight to creating an organization.
- [ ] The create form explains early access before its first field.
- [ ] An organization cannot be created without ticking the early-access box,
      even if the browser's own check is bypassed.
- [ ] Every back-office screen of an organization shows that the product is in
      early access, with a way to contact the product's own people.
- [ ] Each new organization leaves one line in the operational log.

## Out of scope
- A waitlist, invite codes, or any limit on how many organizations can sign up.
  If that is ever needed, it is a new decision.
- Keeping a separate record of when the early-access box was ticked. It is a
  condition of creating the organization, so the organization existing is the
  record.
- Pricing after the test phase, and moving an organization out of it.
- Mailing the product's own people about each new organization.

## Related
- [Use case: Access the back office](access-the-back-office.md): signing in,
  and creating an organization when you have none.
- [Use case: Set up a supporting membership](set-up-supporting-membership.md):
  the form and the setup guide that follow.
- [Use case: Promote membership with a QR code card](promote-with-qr-card.md):
  the front page's card preview.
- [Concept: Data processing agreement](../concepts/data-processing-agreement.md):
  the other box ticked on the create form.
- [Concept: Operational alerting](../concepts/operational-alerting.md)
- [Concept: Organization](../concepts/organization.md)
- [Concept: Brand attribution](../concepts/brand-attribution.md): the front
  page is the surface the attribution points at.
