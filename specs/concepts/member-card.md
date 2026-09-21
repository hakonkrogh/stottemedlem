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
[self-service page](member-self-service.md), it rides along as an attachment on
every [receipt](payment-receipt.md) they are sent, and it has a public address
of its own they can share with anyone.

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
  alongside other content (the self-service page, the thank-you page) the card
  comes first and is the thing highlighted. The
  [receipt](payment-receipt.md)'s bookkeeping detail is secondary to it, and
  belongs below it.
- **A surface that can hand over the card does not also imitate it.** The
  [receipt](payment-receipt.md) email attaches the card as a picture and links
  its public address, both above the paperwork, and draws nothing that looks
  like a card: the attachment is the card, and a text likeness beside it is
  only a worse one.
- **What the card shows**, and nothing more: the member's name, their
  [member number](member-number.md), the organization's name and logo, the
  years supported — as a count inside one big heart, the streak
  ([scorecard](scorecard.md)) — the recruit count once above zero, the period
  the membership is good for, and, in the footer, the QR code beside the
  [brand attribution](brand-attribution.md) with its [heart](brand-mark.md).
  It never shows the member's email, phone, what they paid, or anything about
  the organization's other members — it is made to be shown to strangers.
- **The organization owns the top of the card, the member the middle, and the
  product signs the bottom.**
  The card opens with an identity band — the organization's logo and name,
  with the validity as a small label over the year in its corner, the one
  thing a checker looks for kept in one fixed place. Then the member is the
  subject: their name large, their [number](member-number.md) quietly under
  it, and their streak, with nothing else in that half of the card. The number
  belongs with the name because it is the same person said a second way, and
  it is set at the card's smallest size: it is a permanent fact, not a second
  headline competing with the name it labels. A footer on a field of its own
  closes it: the product's name on the left, the QR code on the right, and
  the invitation to scan between them.
  The code used to be a block in the middle, under the member, because of how
  much it had to carry (below); as a footer it signs the card instead of
  interrupting it. The card itself
  stays colour-neutral (white and ink) so any organization's logo sits
  comfortably, and the heart red is the only colour on it: **no green,
  anywhere**. The [palette](brand-palette.md)'s moss green drew a rule under
  the band and the valid year until it went, because a card presents two
  parties, the member and the organization they back, and the product's own
  colour was a third voice in that. The year is the card's own ink now, while
  it is current. The card is white, not the palette's cream: a
  cream card on the then-cream member page barely lifted off it, and a card is
  meant to read as an object lying on the page. Being the brightest thing on
  the page, it draws the QR code straight on itself; the code used to sit in
  a white panel of its own, which on a white card would be a frame drawn for
  nothing.
- **The card draws no lines.** It drew two for a while, an ink rule under
  the band and a pale one over the footer, and two lines that disagree on
  colour, weight and extent read as a mistake, not as a structure: the top
  one was the darkest line on the card, darker than its own edge, and the
  bottom one too faint to see in the shared picture. Now space alone divides
  the band from the member. The band is neither a line nor a filled field: a
  second colour field at the top competed with the organization's own mark.
  The footer is the one field on the card, the palette's cream with the
  card's own rounded bottom corners, because the product signs the card there
  and a signature sits on its own paper. One field, at the bottom, competes
  with nobody's logo, and it needs no line to say where the member's half
  ends. The member's page is white too since 2026-09-21
  ([palette](brand-palette.md)), so the card's edge and shadow are what
  hold it as an object there, and the cream footer is the one warm field on
  the page.
- **Two inks for the words, not three.** The member's name, the
  organization's name, the year and the years line share one ink; the
  number, the recruit line, the attribution and the invitation to scan share
  a muted one; only the small label over the year is fainter. The
  organization's name and the years line used to sit in a third ink one shade
  off the name's, which read as the same ink rendered inconsistently rather
  than as a step down. The invitation to scan is the one thing on the card
  that asks the reader to do something, so it is not the faintest thing on
  it.
- **The organization's name is prominent.** It answers "supporting member of
  *what?*", so after the member's own name it is the largest text on the card,
  set a step above the valid year beside it.
  A long name wraps onto two or three lines rather than shrinking to a
  whisper: always between words, never inside one, and with the lines as
  even in length as the words allow, so the band reads as a title and not as
  a paragraph. Only a name too long even for three lines is set smaller.
  It breaks on length, not only when it runs out of room: a name of much more
  than twenty characters reads as a caption stretched across the band, so it
  becomes a block of lines beside the logo instead, at the same size.
- **The card speaks the brand's one typeface.** It is set in the same Fraunces
  cut the website's headings use — people meet the card in feeds, emails and
  print, and it must read as the same brand on every channel. One face, one
  cut, everywhere the product writes.
- **The card's words never wait on its typeface**
  ([brand palette](brand-palette.md)). A card carrying a logo, a heart and a QR
  code but not one readable word is not a lesser card: it is not a membership
  card at all. That is what a member was handed on their receipt page on
  2026-09-10, so the words are drawn in whatever serif is at hand rather than
  held back for Fraunces to arrive.
- **A card with no words on it says so.** The card is a picture, and only the
  person looking at it can see what actually landed on the paper: no amount of
  care on the product's side can tell, afterwards, that a member was handed a
  blank one. So every page that shows a card looks at the picture it drew, and
  a card whose name strip came out empty is
  [reported to the operator](operational-alerting.md) by the page itself. The
  member is never told, and nothing about the member travels: they are holding
  a broken card, and being asked about it would only make that their problem.
  The report is a witness, not a guarantee. It cannot catch a card that was
  blank for a moment and then filled in, only one whose words never arrived,
  which is the one a reader is left holding.
- **Four sizes, and no others.** The member's name is the one large thing;
  the organization's name is a step under it, and the years line under the
  heart matches that step, because the middle of the card is the member's own
  half and its lines are read across a room beside a heart that fills it. The
  recruit line and the valid year share a middle size; every caption in the
  band and the footer shares a small one. Text that does not fit steps down to
  the next size rather than shrinking a little at a time, so a long name lands
  on a size the card already uses. The card does not label itself
  "støttemedlem" above the name: the QR caption says it, and the card is one.
- **The card as a picture is drawn once per version of itself.** A card is
  looked at, previewed by every feed it is pasted into, and attached to
  receipts, while what it shows changes only when the member's own facts change
  — a new period, another heart, a recruit, a new name, the organization's new
  logo. So a drawing is kept and handed out again until the card itself
  changes, and a changed card is simply a different picture. A member never
  sees a stale card, and nothing has to be remembered or cleared for that to
  hold.
- **A renewed card shows its new heart on the very next look.** The pages that
  show the card (the member's own page, the thank-you page, the card's public
  address) ask for the picture of the card *as it is now*: a renewal, a
  recruit, a new name or logo makes it a different picture at a different
  address, so nothing a browser kept of the old one is ever shown again. A
  member who renews and goes straight back to their page sees the new heart,
  without a second reload and without anyone clearing anything. (It used to be
  possible to renew and be shown last year's card for a few minutes, because
  the browser held on to the picture while the page around it was fresh.)
- **Every card is derived, with one deliberate exception.** Hearts come from
  [membership](membership.md) periods and the validity from the current
  [annual period](annual-period.md); nothing on the card is stored as a
  separate truth, so a refunded year drops off the card by itself. The
  [member number](member-number.md) is the exception, and it has to be: it is
  a place in an order that already happened, so anything derived from today's
  register would move the day somebody else's payment was given back. It is
  therefore also the one thing on the card a lapsed or refunded membership
  does not take away.
- **The card has a public address of its own** — short, unguessable, and safe
  to post in public. It is not the same address as the member's
  [self-service page](member-self-service.md): that one can *end* the
  membership, so it must never be shared, while the card is made for sharing.
  Holding a card address grants nothing but looking at the card.
- **Handed to a person, the address is spelled the way they read it**:
  støttemedlem.no with its ø, not the ASCII form a browser encodes that as.
  The card's address is posted, pasted and read aloud by people, and the
  encoded spelling reads as a garbled domain rather than as the product's
  name, which is the opposite of what a shared card is for. Everything a
  machine reads keeps the ASCII form, and that is not in tension with this:
  a QR payload, an embed snippet and a link written into an email all go to
  readers that break on the ø ([brand attribution](brand-attribution.md)).
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
- **The card arrives; it does not appear.** The card is a drawn picture
  fetched over the network, and the first time one is drawn that takes the
  better part of a second. For that second the place it will take is not empty:
  it holds the card's own skeleton: the same paper at the same size, the
  footer's field, the organization's mark, bars where each line will land,
  and the streak heart at exactly the place and size the drawn one will take. Then the card fades in
  over it. Because the skeleton is the card's own layout rather than a likeness
  of it, nothing moves when the card lands: the heart the reader has been
  watching simply gains its colour and its count, and the words fill in around
  it. A reader who never sees the skeleton (the picture was already in hand)
  is shown the card at once, and a picture that never comes at all gives up
  its place rather than leaving a heart beating over nothing.
- **The waiting card has a pulse.** The heart is the one shape on the skeleton
  that is not a placeholder for a line of text, so it is the one thing alive on
  it: it beats at a resting human pulse, contracting slightly, for as long as
  the card is on its way. That is the [mark](brand-mark.md) saying the card is
  coming, in the product's own terms rather than a spinner's. It is the only
  motion the product asks for, and a reader who has asked for less motion gets
  a still heart and no fade. The card still arrives, just without the
  performance.
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
- **The code is kept simple so that it can be small.** How big a QR code has to
  be drawn is decided by how much it carries, so the code carries as little as
  it can: a short address of its own, the same length on every card of every
  organization, which leads on to the join page. It used to carry that join
  page's own address, which grew with the organization's name, so the code
  grew too, was different on every organization's cards, and needed the middle
  of the card to stay scannable. Now it needs a corner. Shortening what the
  code says is the way to make the code smaller; drawing the same code
  smaller only makes it harder to scan.
- **The code carries the mark in its middle.** The one red on the card appears
  a third time, small, in the centre of the code
  ([brand mark](brand-mark.md)). It is the only thing drawn on the code, it is
  held to a size measured to leave the code readable, and it costs the code a
  little of how small it may be drawn: the card's code stopped scanning below
  a picture 239 px wide before the heart and 266 px after, against the 760 px
  the card is drawn at. That was judged worth it here and would not be at a
  bigger heart.
- **The scan address is not the card's address.** A member card has three
  addresses and they do different things, in order of what holding one grants:
  the [self-service page](member-self-service.md) can end the membership and
  must never be shared; the card's own address shows the card and is made for
  sharing; the scan address, which is the one the code carries, does nothing
  but hand a scanner on to the organization's join page with the referral
  attached. A scan address that matches nothing reveals nothing, like every
  other address made from a member's card.
- **The product's name is the other half of the footer**: the
  [attribution](brand-attribution.md) every public surface owes, set large
  enough to be read at arm's length now that the code gave the room back. It
  is still outranked by the organization's name, as the attribution always is,
  and it stays in a quiet ink: the size is what gives it presence, and the
  strong ink belongs to the two names the card is about.
- **Where the member is looking at their own card, the card carries the way to
  share it** — an action on the card itself rather than an address printed
  elsewhere on the page. What sharing means is the reader's device's business:
  its own share sheet where it has one, the card's address on the clipboard
  otherwise.
- **Where the card is shown to be passed on, sharing is the one big thing to
  do, and it names the places.** That is two pages: the
  [thank-you page](payment-receipt.md), because the moment a member has just
  paid is when the wish to show the card is strongest and the first time they
  have seen one, and the card's own public address, because that is where the
  receipt email sends a member who wants to look at their card and hand it
  on. Neither leaves the offer to a small pill in the card's corner: under
  the card stands one plain button that says what it is for, in the member's
  own words ("Dette vil jeg dele"). Pressing it shares nothing yet. It opens
  the places the card can go, named one by one: Facebook, the phone's
  messages, email, copying the link, and, only on a device that has one, the
  device's own share sheet. A member handed a bare address is left to work
  out what to do with it; a member shown "Facebook" and "Meldinger" is being
  asked where. Every place works with no scripting at all, because each is a
  link into that place with the card's address already in it. A card shown
  with this offer carries no pill of its own: one page, one way to share, so
  the two cannot disagree about what sharing means. The two pages show the
  same offer because they render the same one thing, card and offer together,
  rather than each assembling it.
- **What is sent along is an invitation, in the voice of whoever can be
  sending it.** It names the organization, asks the reader whether they want
  to join too, and says the link is where the card and the way in are. It
  never says anything else about the member. On the member's own pages it
  speaks as them, because only they can be standing there: *my* card. At the
  card's public address it claims nothing about the sender, because whoever
  was handed the card can pass it on from there, and a message in the
  member's voice in a stranger's hands would be a small lie. (A first version
  only captioned the link, "se medlemsbeviset mitt", and read as odd in a
  text message: the reader was handed a card with no word about why.)
- **Anyone may look; only the member can change it.** The card page offers no
  actions on the membership. A visitor who is not the member sees exactly what
  the member sees.
- **The card's public page opens with the organization.** Above the card
  stands the organization's own identity, the banner, the circled logo and the
  name, presented exactly as on the [join page](join-page.md) and the
  [receipt](payment-receipt.md). A member follows the link to their card from
  the receipt, weeks or years after joining; what they should land on is the
  organization they back, looking the way it looked when they joined, and not
  a bare picture on a site they do not recognise. The card still leads among
  the page's content: the identity is the organization's frame around it, not
  a rival to it, and the card is drawn no differently for it.
- **The organization looks the same way everyone else does.** A member's page
  in the [back office](back-office.md) leads to that member's card at its
  public address, so an administrator checking what a supporter was handed,
  or answering a question about it, sees the card itself and not a
  back-office rendering of it
  ([curate the member list](../use-cases/curate-member-list.md)). There is
  nothing to lead to while there is no card: a supporter who has not paid, or
  a member whose details were erased.
- **The QR code carries the member's referral.** Scanning it goes by way of the
  card's scan address (above) and opens the organization's join page, and a
  join completed from that scan counts as a recruit for the member whose card
  it was
  ([earn hearts and recruit](../use-cases/earn-hearts-and-recruit.md)). The
  member's own recruit count appears on the card only once they have recruited
  someone — a zero is not worth showing.
- **A card exists once the membership does.** A supporter who has started but
  not completed a payment has no card yet; there is nothing to prove.
- **A lapsed card keeps the years and drops the cheer.** The validity corner
  says "Støttet t.o.m." with the last supported year instead of "Gyldig", the
  streak heart goes a neutral grey from the card's own family of tones (not a
  faded red, and not a pink: a heart that is neither red nor ink belongs to
  nothing on the card), and the exclamation mark goes — the years were real
  and stay counted, but the card stops celebrating. It never pretends the
  membership is current.
- **The card says what every other surface says, a renewal still being retried
  included.** A standing belongs to the [membership](membership.md), not to the
  screen showing it: when the [member list](../use-cases/curate-member-list.md)
  has a member as active, their card does too. So a renewal the payment
  provider has not settled either way keeps the card valid, and the card then
  names the period the renewal is being taken for, not the one that has just
  ended: a card left saying "Gyldig" over last year would be claiming a
  validity that has expired. The new heart is not on it yet, because a heart is
  a period paid for and that period is not paid yet; it arrives the moment the
  payment does. (For a while the card flipped to lapsed the day the period
  turned, while the member list correctly kept the same member active. One
  membership, two answers, and the member got the harsher one on the surface
  built for showing to other people.)
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
- Shows the member's [number](member-number.md) and their
  [scorecard](scorecard.md) — hearts, and recruits once there are any.
- Appears on the [member self-service page](member-self-service.md) and in the
  [payment receipt](payment-receipt.md).
- Its QR code leads into the [join page](join-page.md).
- Carries [brand attribution](brand-attribution.md) and the
  [brand mark](brand-mark.md).
- Drawn from the [brand palette](brand-palette.md).
- Wherever it is shown, its space is reserved before the picture arrives and
  holds the card's own skeleton while it waits, so the page around it never
  shifts ([Opening a page](opening-a-page.md)).

## Referenced by
- [Use case: Earn hearts and recruit new members](../use-cases/earn-hearts-and-recruit.md)
- [Use case: Curate the member list](../use-cases/curate-member-list.md)
- [Concept: Scorecard](scorecard.md)
