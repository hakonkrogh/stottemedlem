-- The member's card (specs/concepts/member-card.md): the proof of support a
-- member can look at, keep, and hand to someone else.
--
-- The card needs a public address of its own, and it must NOT be the
-- membership's manage token: that one can end the membership, so a member who
-- posted it on social media would be handing strangers the stop button. This
-- token grants nothing but looking at the card, which is why it is safe to
-- share and why it is a separate secret.
--
-- Every existing member gets one, so no member is left without a card.
ALTER TABLE supporting_members ADD COLUMN card_token TEXT;

UPDATE supporting_members SET card_token = lower(hex(randomblob(16))) WHERE card_token IS NULL;

CREATE UNIQUE INDEX supporting_members_card_token ON supporting_members (card_token);

-- Word of mouth, written down (specs/use-cases/earn-hearts-and-recruit.md).
-- A join that began by scanning someone's card is credited to that member.
-- Recorded on the agreement first, because at drafting time the joiner is
-- still anonymous — Vipps has not told us who they are yet — and copied onto
-- the person once they consent. A recruit is attributed to at most one
-- referring member, so this is set once and never overwritten.
ALTER TABLE membership_agreements ADD COLUMN referred_by_member_id TEXT REFERENCES supporting_members(id);
ALTER TABLE supporting_members ADD COLUMN referred_by_member_id TEXT REFERENCES supporting_members(id);

CREATE INDEX supporting_members_referred_by ON supporting_members (referred_by_member_id);
