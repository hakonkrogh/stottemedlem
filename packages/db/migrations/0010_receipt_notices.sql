-- A receipt is evidence tied to one payment (specs/concepts/payment-receipt.md):
-- the notice that documents a captured charge points at the charge it documents,
-- and at most one receipt ever exists per charge — that is what makes "which
-- captures still owe a receipt?" answerable by comparison instead of memory.
ALTER TABLE member_notices ADD COLUMN charge_id TEXT REFERENCES membership_charges(id);

CREATE UNIQUE INDEX member_notices_receipt_charge
  ON member_notices (charge_id)
  WHERE charge_id IS NOT NULL;
