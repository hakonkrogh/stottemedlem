-- Erasing a member's personal data (specs/use-cases/erase-member-data.md,
-- specs/concepts/member-data.md).
--
-- A member's row is never deleted: the periods they paid for and the payments
-- behind them are the organization's own record of its year, and dropping the
-- row would silently rewrite totals that were already reported. What is erased
-- is the PERSON — name, contact details, the payment provider's id for them,
-- and the two tokens that address their personal pages. What stays is the
-- money: which period, how much, when.
--
-- Set when that has happened, so the member list can say "erased" rather than
-- show a nameless row and leave an administrator wondering what broke, and so
-- the retention sweep never visits the same member twice.
ALTER TABLE supporting_members ADD COLUMN anonymized_at TEXT;

CREATE INDEX supporting_members_anonymized ON supporting_members (org_id, anonymized_at);
