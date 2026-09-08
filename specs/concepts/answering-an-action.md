# Concept: Answering an action

**Status:** Active

## Definition
Every button that does something, anywhere in the product, is **answered in
two steps**: at once, by showing that the action is under way, and when it is
done, by saying what happened. An action that leaves the person looking at an
unchanged screen, for any length of time, has not been answered.

## Why it exists
Most of what a button does here takes seconds, not milliseconds: the keys are
tested against Vipps, an agreement is stopped with Vipps, a refund is asked
for, a picture is stored. A press that shows nothing for that long looks like
a press that did nothing, and the natural response, pressing again or
reloading, is exactly what must not happen: a second refund, a second
agreement, a form that comes back empty. The product owes the person a signal
at the moment they act, and a plain answer when the work is done.

## Rules & invariants
- **The press is answered immediately.** The button itself changes: it shows
  that work is in progress and says, in words, what it is doing ("Lagrer …",
  "Tester nøklene mot Vipps …", "Åpner Vipps …"). The rest of the form waits
  with it. Nothing else on the screen has to be looked at to know the press
  was taken.
- **One press, one action.** While an action is under way the same button
  cannot start it again, and neither can the rest of its form. The product
  never sends an action twice on its own either: if no answer comes back, it
  says so and leaves the next move to the person, rather than guessing that
  the first attempt was lost.
- **Every action that worked says so, in words.** A change that is visible in
  the data is still confirmed in a sentence, in the place the person is
  looking: "Lagret", "«Gull» er arkivert", "200 kr er refundert". A change
  that failed says what went wrong in the same place. The answer is brought
  into view and read out, so it is not missed at the bottom of a long page.
- **The answer arrives in place.** Acting on a form does not throw the page
  away and load it again: what the person was reading stays where it is, and
  the answer appears in it. A rejected form keeps what was typed
  (see [Presenting and editing](presenting-and-editing.md)).
- **The screen after an action can be reloaded.** What the address bar shows
  once an action is answered is the plain address of what is on screen: a
  reload shows the same thing again. It never repeats the action, and never
  brings back the form the person already finished.
- **Actions that hand over to another place keep their own answer.** Joining
  and resuming a membership leave for the payment app; the button still shows
  "Åpner Vipps …" until the app has the person, so the wait before the
  hand-over is never silent.
- **An irreversible action asks first**, in one plain question, before
  anything is sent, and declining sends nothing (see
  [Erase a member's personal data](../use-cases/erase-member-data.md)).
- **None of this depends on the person's browser.** With scripting off, every
  action still works and still ends in the same confirmation on the same
  address; only the immediate signal and the in-place answer need a script.

## Relationships
- Complements [Presenting and editing](presenting-and-editing.md): that
  concept says a save returns to presentation with a confirmation; this one
  says what the person sees between the press and that confirmation, and that
  the confirmation is a place that can be reloaded.
- Applies to every action in the [back office](back-office.md), on the
  [join page](join-page.md) and on the
  [member's own page](member-self-service.md).

## Referenced by
- [Concept: Presenting and editing](presenting-and-editing.md)
- [Concept: Back office](back-office.md)
- [Concept: Member self-service page](member-self-service.md)
- [Concept: Join page](join-page.md)
