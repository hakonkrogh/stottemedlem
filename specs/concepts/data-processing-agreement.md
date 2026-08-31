# Concept: Data processing agreement

**Status:** Draft

## Definition
The **data processing agreement** (Norwegian: *databehandleravtale*) is the
standing arrangement between an [organization](organization.md) and the product
about the organization's [member data](member-data.md): the organization
decides that it keeps a register and what it is for; the product holds and
processes that register on the organization's behalf and for no purpose of its
own.

It is **one standard text for every organization**, public, versioned by date,
and **accepted by ticking a box when the organization is created** — not
signed, not negotiated, not uploaded.

## Why it exists
The product holds real people's names and contact details on behalf of
organizations that are answerable for them. That arrangement has to be agreed
rather than assumed, and the organization has to be able to point at what was
agreed and when.

The shape follows from who these organizations are. A marching band or a choir
run by volunteers will not negotiate a contract, and a long one will not be
read — so the text is short, plain and public.

The **acceptance is a deliberate act**, because the administrator is taking on
responsibility for other people's data and should have to notice doing it. A
line of small print under a button can be true and still leave someone
genuinely unaware; a box they have to tick cannot. The cost is one click, and
the gain is that "they accepted" describes something that actually happened.

## Rules & invariants
- **One text, same for everyone.** The product collects the same data from
  every supporter of every organization, so there is nothing per-organization
  to configure and nothing an administrator can get wrong.
- **Accepted by an explicit tick when the organization is created.** The create
  form carries a checkbox naming the agreement and linking it. It is
  **required** — an organization cannot be created without it — and **never
  pre-ticked**: a box that arrives already checked records a click nobody made.
  The checkbox sits **above** the create button, because a condition of
  pressing something belongs before it, not in small print beneath it.
- **The requirement is enforced on the server**, not only by the browser.
  Otherwise an unticked box could still produce an organization whose
  acceptance the product would then be recording falsely.
- **Readable before it is accepted.** The agreement is a public page, reachable
  with no session at all — otherwise the box asks someone to accept something
  they cannot read.
- **Dated, and re-accepted when it changes.** Every acceptance records which
  version was accepted. A change in substance means every organization is asked
  again; an organization on a superseded version counts as not having accepted.
- **An acceptance is never invented.** The product does not record that an
  organization accepted the agreement unless somebody actually did so — by
  ticking the box at creation, or by accepting a new version in the back
  office, where an outstanding acceptance is a visible item like anything else
  not yet in order.
  The single exception is the **operator's own organization**, which existed
  before the agreement did: the operator accepted on its behalf, once, as a
  deliberate migration. It is stamped with the date that decision was made and
  never backdated to the organization's creation — a recorded acceptance must
  always name a day on which something really happened. This applies to
  organizations already present when the agreement was introduced; it is not a
  mechanism, and no future organization arrives this way.
- **The register belongs to the organization.** The agreement says so, and the
  product behaves that way: the register can always be exported, and it goes
  with the organization if it leaves.
- The agreement states what the product does **not** do — no selling, no
  sharing beyond the named subprocessors, no marketing, no profiling, no
  collecting beyond [member data](member-data.md) — because for this audience
  the reassurance is the useful half.
- **Subprocessors are named, not merely alluded to**, and a change to them is
  announced before it happens.

## Relationships
- Between an [organization](organization.md) and the product.
- Governs the [member data](member-data.md) the organization's register holds,
  including its retention and erasure rules.
- Accepted during [set up a supporting membership](../use-cases/set-up-supporting-membership.md);
  its outstanding state is one of the back office's warnings
  (see [back office](back-office.md)).

## Referenced by
- [Concept: Member data](member-data.md)
- [Concept: Organization](organization.md)
- [Use case: Set up a supporting membership](../use-cases/set-up-supporting-membership.md)
