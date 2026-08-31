-- The data processing agreement an organization accepts by signing up
-- (specs/concepts/data-processing-agreement.md).
--
-- The organization decides that it keeps a member register; the product holds
-- that register on its behalf. That arrangement needs to be agreed rather than
-- assumed, and the agreement has to be dated — "we have one" is not an answer
-- to "which one, and since when".
--
-- Left NULL on purpose for organizations created before this existed: they
-- never saw the text, and recording an acceptance that never happened would be
-- exactly the lie the column is meant to prevent. The back office asks them,
-- once, instead.
ALTER TABLE organizations ADD COLUMN dpa_accepted_at TEXT;

-- WHICH version was accepted. A later revision has to be accepted again, and
-- without this there is no way to tell who is on the old one.
ALTER TABLE organizations ADD COLUMN dpa_version TEXT;
