-- Backfill the data processing agreement for organizations that predate it
-- (specs/concepts/data-processing-agreement.md).
--
-- Migration 0013 deliberately left these NULL, so that every organization would
-- be asked rather than assumed. That was the right default for a product with
-- organizations it does not own; it is the wrong one here, because at this
-- point there is exactly ONE organization and it belongs to the operator. Being
-- prompted to accept an agreement with yourself is noise, not consent.
--
-- So this is the operator accepting on their own organization's behalf, and it
-- is recorded as what it is: stamped at MIGRATION time, not backdated to the
-- organization's creation. Backdating would claim someone ticked a box on a day
-- when no box existed — the one thing these columns are here to prevent.
--
-- This backfills only what is already there. Every organization created after
-- this point ticks the box on the create screen, and a future version of the
-- agreement is accepted in the back office — neither path comes through here.
UPDATE organizations
SET dpa_accepted_at = datetime('now'),
    dpa_version = '2026-08-31'
WHERE dpa_accepted_at IS NULL;
