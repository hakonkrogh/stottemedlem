-- The address a member manages their own membership at.
--
-- Norwegian merchants must offer real self-service management of a recurring
-- agreement — stopping it, not just being told whom to email. The page has no
-- login: it is reached from the member's own Vipps app, which opens the
-- agreement's merchantAgreementUrl. That URL therefore has to carry proof that
-- the opener is the member, so it embeds an unguessable token rather than the
-- (short, semi-guessable) Vipps agreement id.
--
-- Existing rows get a token too, so no agreement is left unmanageable.
ALTER TABLE membership_agreements ADD COLUMN manage_token TEXT;

UPDATE membership_agreements SET manage_token = lower(hex(randomblob(16))) WHERE manage_token IS NULL;

CREATE UNIQUE INDEX membership_agreements_manage_token ON membership_agreements (manage_token);
