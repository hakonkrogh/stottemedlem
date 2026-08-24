-- What the product has told a supporting member about their own membership
-- (specs/concepts/member-notice.md). Only messages that actually went out are
-- recorded: this table is the evidence that a member was not surprised, and it
-- decides what they may be charged, so a send that failed must leave no trace.
CREATE TABLE member_notices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  member_id TEXT NOT NULL REFERENCES supporting_members(id),
  agreement_id TEXT REFERENCES membership_agreements(id),
  kind TEXT NOT NULL,
  tier_id TEXT REFERENCES membership_tiers(id),
  -- The amount announced, and the one it replaced.
  fee_nok INTEGER,
  previous_fee_nok INTEGER,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- "What was this member last told about this tier, and how long ago?" — the
-- question asked once per member on every renewal run.
CREATE INDEX member_notices_member_kind
  ON member_notices (member_id, tier_id, kind, sent_at);
CREATE INDEX member_notices_org ON member_notices (org_id, sent_at);
