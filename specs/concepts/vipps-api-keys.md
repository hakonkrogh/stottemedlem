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
- Stored keys are encrypted, isolated per organization, and never leave the
  back office: after saving, the two secret values are only ever shown
  masked. Replacing them means pasting a full new set.
- The product records when the keys last passed the live proof, and an
  administrator can re-run it at any time.

## Relationships
- Belong to exactly one [organization](organization.md); managed by its
  [administrators](administrator.md).
- Unlock collecting the [annual fee](annual-fee.md) from
  [supporting members](supporting-member.md).

## Referenced by
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
