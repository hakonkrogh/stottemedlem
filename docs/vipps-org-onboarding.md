# Getting an organization live with Vipps — onboarding checklist

> **Status: draft, iterate on this.** Distilled from
> [`research/vipps-recurring-payments.md`](research/vipps-recurring-payments.md)
> (finding 11 + appendix) and current Vipps MobilePay self-serve onboarding.
> Two audiences:
>
> 1. **Detailed instructions** — shown to an admin right after they create their
>    organization in støttemedlem, as the "what happens next" checklist.
> 2. **Marketing-site headlines** — the 3-step version that tells a prospect
>    "this is all it takes" before they sign up.
>
> **Baseline assumption:** the organization **already has a standard Vipps
> MobilePay business account** (merchant agreement) and can accept payments —
> e.g. it takes Vipps at events or sells via a Vipps number today. What's left
> is adding the **Faste betalinger** (Recurring Payments) product and connecting
> it to støttemedlem. *Not* Vipps Donasjoner — ruled out for memberships (yearly
> billing and org-set amounts are impossible there; see research appendix A).

---

## Part 1 — Detailed instructions (post org-creation)

### A. Prerequisite — a working Vipps business account

- [ ] The organization has an **active Vipps MobilePay merchant agreement** for
      its org.nr and can already accept payments, with access to
      **portal.vippsmobilepay.com** for the org.
- [ ] You know who in the organization can **sign additions to the agreement**
      (signatur/prokura as registered in Brønnøysund) with BankID, in case the
      product order needs a signature.

> *No Vipps business account yet?* Get one first at vippsmobilepay.com — you
> need the org.nr (Enhetsregisteret), a bank account in the organization's
> name, and a BankID signer; Vipps' KYC review takes a few days. Come back to
> this checklist once you can accept payments.

### B. Create the Faste betalinger product in Vipps

This is the step our onboarding must walk the admin through in detail — the
org creates the product themselves in the Vipps portal (we don't do it for
them; see open question 1). The product to create is **Faste betalinger**
(Recurring Payments); it is what støttemedlem uses for annual membership
charges.

1. - [ ] Log in to **portal.vippsmobilepay.com** with a user that has access
         to the organization's agreement.
2. - [ ] Order the product:
         - Org already has an **online-payment sales unit** (e.g. Vipps
           Checkout / ePayment on a website): choose **"Add"** next to
           *Recurring Payments / Faste betalinger* on that sales unit.
         - Org only takes Vipps in person (Vippsnummer): order **Faste
           betalinger** as a new product on the agreement — this creates a new
           sales unit for it.
3. - [ ] Provide the **website and sales-terms links** the order form requires
         (verified 2026-07-28 in the
         [portal walkthrough, step 4](vipps-portal-walkthrough/README.md)). The
         form asks for (a) a live web page with company name, org.nr, contact
         information, and products/prices, and (b) a sales-terms page covering
         at minimum payment, angrerett, returns, and complaint handling — each
         behind a "Verifiser nettstedet" check. **støttemedlem hosts both for
         the organization:** paste the org's public landing page URL and its
         salgsvilkår URL (shown in the org's back office; see
         [`specs/concepts/org-landing-page.md`](../specs/concepts/org-landing-page.md)).
         Answer "Ja, den er live".
4. - [ ] Answer the extra compliance questions the recurring product requires
         (mandated by financial regulators, on top of the checks the org
         already passed). Suggested answers for a supporting membership:
         - *expected turnover*: estimated yearly membership income
           (members × annual fee);
         - *share of recurring payments*: 100 % on this sales unit;
         - *agreement length*: ongoing until cancelled;
         - *billing interval*: yearly.
5. - [ ] Sign with BankID if prompted (the registered signer from step A).
6. - [ ] Wait for Vipps' approval of the product. Since the org already passed
         KYC, this is usually quick; Vipps follows up by email if anything is
         missing.

> For the in-product guide: verify the exact portal click-path and wording
> with a real test org and capture screenshots before writing the final copy —
> the navigation above is from Vipps docs, not a walked-through session (see
> open question 6).

### C. When approved

- [ ] The sales unit that carries Faste betalinger has a **Merchant Serial
      Number (MSN)** — visible in portal.vippsmobilepay.com. This is what
      identifies the organization's membership payments.
- [ ] Connect the sales unit to støttemedlem: in the portal, open the sales
      unit's **API keys** (under *Developer / Utvikler*) and paste the MSN and
      keys into the organization's Vipps settings in støttemedlem.

### D. Finish setup in støttemedlem

- [ ] Set the [annual fee](../specs/concepts/annual-fee.md) and confirm the
      organization's public name — see
      [Set up a supporting membership](../specs/use-cases/set-up-supporting-membership.md).
- [ ] Get the [join entry point](../specs/concepts/join-entry-point.md) (link /
      QR code card) and share it. First payment can happen immediately — no
      further setup.

### Good to know (for the instructions page, not steps)

- **Cost:** Faste betalinger is priced at **2.99 % + 1 NOK per transaction**
  (2026 list price; possible reduced NGO rates — unconfirmed). No monthly fee
  from Vipps for the basic self-serve setup.
- **Payouts:** money from completed charges is settled to the org's bank
  account at **T+2**, same as the org's existing Vipps payments.
- **Timeline expectation to set:** with the Vipps business account already in
  place, activating Faste betalinger is one product order in the portal plus a
  short approval wait — then setup in støttemedlem takes minutes.

---

## Part 2 — Marketing-site headlines

The promise: *already taking Vipps? Then you're one product order away.*
Three steps, org's point of view:

1. **Opprett organisasjonen din** — register your organization in støttemedlem
   and set the annual fee. Takes minutes.
2. **Aktiver Faste betalinger** — add *Faste betalinger* to your existing
   Vipps agreement in the Vipps portal and connect it to støttemedlem.
3. **Del lenken** — put your join link or QR code where your community sees
   it. Supporters pay in Vipps, and your member list stays up to date by
   itself.

Fine print under the steps (one line): *Krever Vipps MobilePay-bedriftsavtale
for organisasjonen. Vipps tar 2,99 % + 1 kr per transaksjon.*

---

## Open questions

1. **Should støttemedlem create the Vipps product for the org?** I.e. instead
   of the admin ordering *Faste betalinger* manually in the portal (step B),
   our system creates/prefills that product order on the org's agreement so
   backing the membership with Vipps is (near) one click from our side. What
   we know: prefilling a product order via the Vipps **Management API** is a
   *partner-key* capability, and even then the merchant must review and submit
   the order in the portal themselves — so this would mean revisiting the
   no-platform-partner decision (2026-07-28), and it removes form-filling, not
   the review/sign/approval steps. Worth reconsidering once manual onboarding
   friction is measured with pilot orgs.
2. **NGO pricing** — reduced rates via Innsamlingskontrollen / Fundraising
   Norge are referenced by Vipps but not on the pricing page; confirm.
3. **Approval turnaround for adding Faste betalinger** to an existing,
   KYC-approved agreement — "usually quick" is an assumption; measure with the
   first pilot orgs and adjust the copy.
4. **Yearly vs. recurring wording** — the Vipps agreement the supporter accepts
   is a recurring (yearly) payment agreement; check how prominently the
   marketing copy should say "automatic yearly renewal" for trust/compliance.
5. **How many target orgs actually have a Vipps business account already?**
   If a meaningful share don't, the "no account yet" path (org.nr, bank
   account, BankID signer, full KYC — see the note under A) may deserve its
   own instructions page rather than one line.
6. **Verify the portal walkthrough in step B** — the click-path ("Add" next to
   Recurring Payments vs. ordering as a new product) comes from Vipps docs;
   walk it through with a real test org, confirm the compliance-question
   wording, and capture screenshots for the in-product guide.
