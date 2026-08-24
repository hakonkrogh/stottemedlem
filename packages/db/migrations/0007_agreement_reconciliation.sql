-- When we last checked an agreement against the payment provider.
--
-- Payment events are delivered at-least-once, which also means at-most-never:
-- a delivery can be lost outright (a receiver that was down, a URL that no
-- longer exists) and nothing about the money notices. The product therefore
-- re-reads the provider on a schedule instead of trusting that it was told
-- (specs/concepts/payment-reconciliation.md).
--
-- The column is what keeps that sweep bounded and fair: agreements are visited
-- oldest-check-first, so every agreement comes round again no matter how many
-- there are. NULL means never checked, which sorts first.
ALTER TABLE membership_agreements ADD COLUMN last_reconciled_at TEXT;

CREATE INDEX membership_agreements_reconcile
  ON membership_agreements (org_id, status, last_reconciled_at);
