# Concept: Administrator

**Status:** Draft

## Definition
An **administrator** is a person who acts on an
[organization](organization.md)'s behalf in the back office — signing in,
setting up its supporting membership, and curating its member list. It is the
human identity behind the B2B side of the product; an organization does the
things it does *through* its administrators.

## Why it exists
Organizations are not people, but someone has to sign in and make decisions for
them. The product models that someone explicitly so it can answer two questions:
*who is this*, and *which organization's data may they see and change*. Access is
always scoped to an organization the administrator belongs to.

## Rules & invariants
- An administrator signs in with their **own** identity, not a shared
  organization login.
- An administrator belongs to zero or more organizations. With none, the first
  thing they do is create one (becoming its administrator). With one or more,
  they act within exactly **one active organization** at a time.
- An administrator can see and change data only for organizations they belong to.
- Every [organization](organization.md) has at least one administrator; the
  person who creates it is its first.
- For now there is a single level of access: every administrator of an
  organization is a full administrator (no roles or partial permissions).

## Relationships
- Administers one or more [organizations](organization.md); an organization has
  one or more administrators.
- Distinct from a [supporting member](supporting-member.md) — a different
  population, signing in a different way, who joins and pays rather than
  administers.

## Referenced by
- [Use case: Access the back office](../use-cases/access-the-back-office.md)
- [Concept: Organization](organization.md)
