# Concept: Vipps API keys

**Status:** Draft

## Definition
An [organization](organization.md)'s **Vipps API keys** are the credential set
its own Vipps MobilePay sales unit issues (client id, client secret,
subscription key, and the sales unit's MSN). They are what lets the product
act toward Vipps *as the organization* — drafting recurring agreements,
charging the [annual fee](annual-fee.md), and receiving payment events on the
organization's behalf.

## Why it exists
The product deliberately has no platform-wide Vipps agreement: every
organization holds its own agreement with Vipps and gets paid directly
(decided 2026-07-28 — no platform-partner model to begin with). Bringing its
own keys is therefore the organization's final onboarding step: it is the
moment the register the product maintains becomes able to actually collect
money.

## Rules & invariants
- An organization has **exactly one set** of Vipps API keys (or none yet —
  until keys are added, the organization cannot take payments and its
  [administrators](administrator.md) are prompted to add them).
- Keys are added, replaced, and seen only by the organization's
  administrators, in the back office.
- Keys are **proven before they are kept**: the product performs a live,
  read-only call to Vipps with the submitted keys and refuses to store a set
  that Vipps rejects.
- Which Vipps environment the keys must belong to is decided by where the
  product itself runs — the production product accepts only production keys;
  every other environment talks to Vipps' test environment and accepts only
  test keys. This is not a choice the organization makes in the product; a
  set from the wrong environment simply fails the proof above.
- Outside production, an organization that has not added keys of its own may
  fall back to a shared **test** sales unit belonging to the deployment, so
  the payment flow can be rehearsed end to end before any organization brings
  its own credentials. The production product never does this: there, only
  keys an administrator connected can move an organization's money.
- Stored keys are encrypted, isolated per organization, and never leave the
  back office: after saving, the two secret values are only ever shown
  masked. Stored keys are **presented, not offered as a form**
  ([presenting and editing](presenting-and-editing.md)); replacing them is a
  deliberate action and means pasting a full new set.
- The product records when the keys last passed the live proof, and an
  administrator can re-run it at any time.
- **Payment events connect themselves.** For memberships to update on their
  own when someone pays, Vipps must know where to deliver the organization's
  payment events — but arranging that is never the administrator's job. The
  product registers the delivery address with Vipps as soon as keys are
  stored, and keeps the registration pointing at the running product on its
  own: a registration that is missing (the first attempt failed) or pointing
  at an outdated address is repaired automatically no later than the
  product's next scheduled run. Re-proving the keys also brings the
  registration up to date at once.
- **Connected payment events are not worth saying.** Because the connection
  looks after itself, the back office says nothing about it while it is
  working — an administrator has nothing to do and nothing to check.
- **A connection that is not working is said out loud**: when the product has
  no registration for the organization, or the registration points somewhere
  other than where this deployment receives events, the back office says so, in
  terms of the consequence (a payment may not update a membership by itself),
  and shows where the events should go and where they go today. There the
  administrator **can ask for it to be connected now** — the same repair the
  next scheduled run would make anyway, brought forward, because waiting is the
  only alternative and it is not obvious how long that is. It is a retry, never
  a setup step: nothing about it is the administrator's to configure, and if it
  fails they are told it will still be retried on its own.
- The delivery secret the payment provider issues at registration — the only
  proof a delivery is genuine — is stored with the same per-organization
  isolation as the keys themselves.

## Relationships
- Belong to exactly one [organization](organization.md); managed by its
  [administrators](administrator.md).
- Unlock collecting the [annual fee](annual-fee.md) from
  [supporting members](supporting-member.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
