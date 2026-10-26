# Concept: Member voice

**Status:** Active

## Definition
The **member voice** is the one way the product speaks to a
[supporting member](supporting-member.md) and to the public around an
organization: on the [join page](join-page.md), the receipt page, the
[member's own page](member-self-service.md), in every
[member notice](member-notice.md), on the [card](member-card.md) and in the
invitation that travels with it. It is a set of rules about who is speaking,
what gets said first, and which words are used, so that everything a member
reads from the product sounds like one voice, whoever wrote it and whenever.

## Why it exists
The product carries an organization's words to people who chose to back that
organization. Those people never asked for software; they wanted to support a
marching band or a choir. Every message is therefore a moment where the
product can sound like the organization thanking a friend, or like a payment
system talking to a customer. Without a written voice, each new page and
notice drifts towards the second, because that is the default register of
software. The receipt email did exactly that until 2026-10-26: it opened with
"your membership is renewed" and a table of figures.

## Rules & invariants
- **The organization speaks; the product carries.** A page or a notice is
  the organization's word to its member: it names the organization, is signed
  by it ("Hilsen Bakvendtland Skolekorps") and comes from it in the member's
  inbox. The product speaks in its own name only in the
  [attribution](brand-attribution.md) line and when it reports its own
  failure ("Vi fikk ikke stoppet medlemskapet nå. Prøv igjen om litt."). A
  message never says "oss" for the organization: the organization is named,
  because the product cannot know what "we" the reader has in mind.
- **Bokmål, "du", everyday words.** The member is addressed as *du*, by
  first name and surname when the register holds a name ("Hei Kari
  Nordmann,") and "Hei," when it does not. The words are the member's own
  ("medlemskapet", "det du betaler", "si opp"), never the law's or the
  payment provider's ("ytelse", "agreement", "charge"). A
  [receipt](payment-receipt.md) adheres to the law without citing it.
- **Thanks are for the act, never praise of the person.** Gratitude names
  the organization and what the member did: "Tusen takk for at du støtter
  Bakvendtland Skolekorps enda et år!", "Takk for støtten! Du er nå
  støttemedlem i …". It does not grade the member ("du er fantastisk", tried
  and dropped the same day it was written): that is the product flattering a
  stranger on the organization's behalf, and it reads as marketing. Warmth
  comes from naming what the support does, in the product's own narrative:
  the support counts, year for year, which is what the card's hearts show.
- **One heart, one exclamation mark.** The red heart is the
  [brand mark](brand-mark.md), and in text it appears at most once per
  message, at the end of the thank-you or the invitation, never as
  decoration elsewhere. A message raises its voice once at most; the rest is
  said plainly.
- **What matters to the member comes first; the paperwork after.** A
  thank-you before a receipt, the card before the figures, the answer before
  the explanation. Facts the law or the books need are complete, and they
  come last.
- **Money is always spelled out: what is paid now, what happens next, and
  the way out.** Every page and notice that touches money says what the
  member pays at this moment (often "ingenting nå"), when the next payment
  comes and what it will be, and how to stop ("Vil du ikke fortsette, kan du
  stoppe det her"). Nothing is left for the member to infer from a
  provider's app. Amounts are written as people say them ("1 200 kr", "240 kr
  i året").
- **Honest about state.** The product never claims something that has not
  happened: a receipt "kommer også på e-post" until it was actually sent, a
  payment is "ikke bekreftet ennå" until the provider confirmed it. When
  something did not work, the text says what did not happen and what to do,
  without blame and without codes.
- **In a stranger's hands, the third person.** Text a member may pass on to
  someone else (the card's invitation) speaks as the member only where only
  the member can be standing; wherever a stranger may send it on, it names
  the member in the third person, which stays true whoever presses the
  button ([member card](member-card.md)).
- **Subjects say what the message is about, with the organization's name
  in it.** A sum appears in a subject only when the sum is the news (a fee
  change), never on a receipt, whose subject reads as the thank-you it is.
- **Addresses are spelled the way people read them**: støttemedlem.no with
  its ø wherever a person sees it ([brand attribution](brand-attribution.md)).

## Relationships
- Governs the words on the [join page](join-page.md), the receipt page, the
  [member's own page](member-self-service.md), every
  [member notice](member-notice.md) including the
  [payment receipt](payment-receipt.md), the [card](member-card.md) and its
  invitation.
- Sits beside the [brand attribution](brand-attribution.md),
  [brand mark](brand-mark.md) and [brand palette](brand-palette.md), which
  say how the product looks where this says how it sounds.

## Referenced by
- [Concept: Payment receipt](payment-receipt.md)
- [Concept: Member notice](member-notice.md)
- [Use case: Renew annual membership](../use-cases/renew-annual-membership.md)
