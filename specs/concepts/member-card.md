# Concept: Member card

**Status:** Draft

## Definition
The **member card** (*medlemsbevis*) is a supporting member's proof that they
back an organization — one small, self-contained thing showing who they are,
which [organization](organization.md) they support, the
[hearts](scorecard.md) they have collected, and the organization's own logo
when it has one. It carries a QR code that leads anyone who scans it into that
organization's [join flow](../use-cases/join-as-supporting-member.md), crediting
the join back to the member who showed the card.

It is one card per member per organization, and it **follows the member across
every surface**: it is the first thing on their
[self-service page](member-self-service.md), it rides along in every
[receipt](payment-receipt.md) they are sent, and it has a public address of its
own they can share with anyone.

## Why it exists
A supporting membership is otherwise a line in someone else's database. Nothing
in a bank statement says "I have backed this choir for eight years", and there
is nothing to show a friend. The card makes the membership into an object: the
member can look at it, be a little proud of it, and hand it on — and handing it
on is exactly how the organization grows, because the card recruits.

It also answers a plainer question the product kept forcing people to hunt for:
*am I actually a member right now?* The card says so at a glance, on whichever
surface the member happens to be looking at.

## Rules & invariants
- **The card leads; the paperwork follows.** Wherever the card appears
  alongside other content — the receipt email, the self-service page — the card
  comes first and is the thing highlighted. The
  [receipt](payment-receipt.md)'s bookkeeping detail is secondary to it, and
  belongs below it or in an attachment.
- **What the card shows**, and nothing more: the member's name, the
  organization's name and logo, the years supported — as a count inside one
  big heart, the streak ([scorecard](scorecard.md)) — the recruit count once
  above zero, the period the membership is good for, the QR code, and the
  [brand attribution](brand-attribution.md) with its [heart](brand-mark.md).
  It never shows the member's email, phone, what they paid, or anything about
  the organization's other members — it is made to be shown to strangers.
- **The organization owns the top of the card; the member owns the middle.**
  The card opens with an identity band — the organization's logo and name,
  with the validity as a small label over the year in its corner, the one
  thing a checker looks for kept in one fixed place — and then the member is
  the subject: their name large, their streak, their QR code. The card itself
  stays colour-neutral (white and ink) so any organization's logo sits
  comfortably; the heart red is the product's one strong colour on it, and
  the [palette](brand-palette.md)'s moss green appears only as the one rule
  under the band and the valid year. The band is a
  line, not a filled field: a second colour field at the top competed with
  the organization's own mark. The card is white, not the page's cream: a
  cream card on the cream member page barely lifted off it, and a card is
  meant to read as an object lying on the page. Being the brightest thing on
  the page, it draws the QR code straight on itself; the code used to sit in
  a white panel of its own, which on a white card would be a frame drawn for
  nothing.
- **The organization's name is prominent.** It answers "supporting member of
  *what?*", so after the member's own name it is the largest text on the card.
  A long name wraps onto two or three lines rather than shrinking to a
  whisper: always between words, never inside one, and with the lines as
  even in length as the words allow, so the band reads as a title and not as
  a paragraph. Only a name too long even for three lines is set smaller.
- **The card speaks the brand's one typeface.** It is set in the same Fraunces
  cut the website's headings use — people meet the card in feeds, emails and
  print, and it must read as the same brand on every channel. One face, one
  cut, everywhere the product writes.
- **Three sizes, and no others.** The member's name is the one large thing;
  the organization, the years line and the valid year share a middle size;
  every caption shares a small one. Text that does not fit steps down to the
  next size rather than shrinking a little at a time, so a long name lands on
  a size the card already uses. The card does not label itself
  "støttemedlem" above the name: the QR caption says it, and the card is one.
- **The card as a picture is drawn once per version of itself.** A card is
  looked at, previewed by every feed it is pasted into, and attached to
  receipts, while what it shows changes only when the member's own facts change
  — a new period, another heart, a recruit, a new name, the organization's new
  logo. So a drawing is kept and handed out again until the card itself
  changes, and a changed card is simply a different picture. A member never
  sees a stale card, and nothing has to be remembered or cleared for that to
  hold.
- **Every card is derived.** Hearts come from
  [membership](membership.md) periods and the validity from the current
  [annual period](annual-period.md); nothing on the card is stored as a
  separate truth, so a refunded year drops off the card by itself.
- **The card has a public address of its own** — short, unguessable, and safe
  to post in public. It is not the same address as the member's
  [self-service page](member-self-service.md): that one can *end* the
  membership, so it must never be shared, while the card is made for sharing.
  Holding a card address grants nothing but looking at the card.
- **A shared card previews as the card.** When the address is pasted into a
  chat or a social feed, the card itself is what appears — an image of the
  card, not a bare link. How much of it a given feed shows is that feed's
  business, not a reason to draw a second card (below).
- **There is exactly one card, and it is upright.** It is a picture, so it
  cannot reflow, and the surface that decides its shape is a phone: that is
  where a member looks at their card and where its QR code is held up to a
  camera. Laid out across the page instead, it arrives in a phone-width column
  with a QR code too small to scan and lines too small to read — and a card
  nobody can scan has lost the half of its purpose that recruits.
- **One card, not one per surface.** A second, across-the-page version existed
  for a while purely because link previews show that proportion uncropped. It
  was dropped: two drawings have to be kept saying the same thing about the
  same member, and the accepted cost is that a shared card is cropped in some
  feeds rather than shown whole. What the member is looking at is always
  exactly what they hand on.
- **The card sits on the page with air around it.** Wherever it is shown — the
  thank-you page, the member's own page, its public address — it keeps the
  page's margins on both sides and a little extra space above and below, so it
  reads as an object lying on the page rather than as the page itself. (It ran
  edge to edge on phones for a while, to buy the QR code a few more pixels; it
  looked cramped, and the room was not worth it.) Where there is room to spare
  it stops growing rather than filling the width — an upright card poured
  across a desktop column reads as a poster, not as a card. The card brings
  no ground of its own: behind its edge and shadow the picture is empty, so
  it lies on whatever page (or feed, or email) is showing it. It used to
  carry a warm backdrop, which on the member's own page showed up as a darker
  slab around the card rather than as the page.
- **The QR code is sized to be scanned, not to dominate.** It is the smallest
  it can be and still come off a screen or a print into a camera — past that
  it takes the card away from the member, who is what the card is about. It
  sits close to what is around it: a code wrapped in empty space reads as the
  card's subject, and the subject is the member.
- **Where the member is looking at their own card, the card carries the way to
  share it** — an action on the card itself rather than an address printed
  elsewhere on the page. What sharing means is the reader's device's business:
  its own share sheet where it has one, the card's address on the clipboard
  otherwise.
- **Anyone may look; only the member can change it.** The card page offers no
  actions on the membership. A visitor who is not the member sees exactly what
  the member sees.
- **The QR code carries the member's referral.** Scanning it opens the
  organization's join page, and a join completed from that scan counts as a
  recruit for the member whose card it was
  ([earn hearts and recruit](../use-cases/earn-hearts-and-recruit.md)). The
  member's own recruit count appears on the card only once they have recruited
  someone — a zero is not worth showing.
- **A card exists once the membership does.** A supporter who has started but
  not completed a payment has no card yet; there is nothing to prove.
- **A lapsed card keeps the years and drops the cheer.** The validity corner
  says "Støttet t.o.m." with the last supported year instead of "Gyldig", the
  streak heart goes muted, and the exclamation mark goes — the years were real
  and stay counted, but the card stops celebrating. It never pretends the
  membership is current.
- A card that no longer matches a membership reveals nothing — not the
  organization, not that some other card exists.
- The card is a **member's** object. The organization's own unattributed QR
  code card ([promote with a QR code card](../use-cases/promote-with-qr-card.md))
  is a different thing with a different owner.

## Open questions
- **Inviting a lapsed member back.** How a lapsed card *says* it is lapsed is
  settled (above); whether it should also invite the member themselves to
  renew is not.
- **Wallet passes.** Apple/Google Wallet is the obvious next surface for
  something called a card, and is deliberately not attempted yet.

## Relationships
- Belongs to one [supporting member](supporting-member.md) and one
  [organization](organization.md).
- Shows the member's [scorecard](scorecard.md) — hearts, and recruits once
  there are any.
- Appears on the [member self-service page](member-self-service.md) and in the
  [payment receipt](payment-receipt.md).
- Its QR code leads into the [join page](join-page.md).
- Carries [brand attribution](brand-attribution.md) and the
  [brand mark](brand-mark.md).
- Drawn from the [brand palette](brand-palette.md).

## Referenced by
- [Use case: Earn hearts and recruit new members](../use-cases/earn-hearts-and-recruit.md)
- [Concept: Scorecard](scorecard.md)
