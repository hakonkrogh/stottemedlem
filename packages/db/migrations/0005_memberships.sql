-- The member registry (specs/concepts/membership.md). Vipps cannot serve as
-- this register: an agreement carries no member identity beyond a `sub` whose
-- profile is fetchable for 168 hours, there is no way to list agreements of all
-- statuses, and no retention is documented. These tables are therefore the
-- system of record for who supports whom, at which level, for which year — and
-- for the payment history behind it (bokføringsloven: 5 years).
--
-- Four tables, because they change on different clocks:
--   supporting_members    the person            (persists across years)
--   membership_agreements the standing yearly arrangement with Vipps
--   memberships           one calendar-year period (specs/concepts/annual-period.md)
--   membership_charges    every payment attempt, successful or not

-- The person backing an organization. Identity comes from their Vipps profile
-- with their consent, captured at joining and never re-fetched (the 168-hour
-- window), so these columns are what the organization will ever have.
CREATE TABLE supporting_members (
	id TEXT PRIMARY KEY,
	org_id TEXT NOT NULL REFERENCES organizations(id),
	name TEXT,
	email TEXT,
	phone TEXT,
	-- Vipps' opaque per-user id: how a returning supporter is recognized as the
	-- same person rather than a duplicate. NULL until an agreement activates.
	vipps_sub TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX supporting_members_org ON supporting_members (org_id);
-- SQLite treats NULLs as distinct, so members without a sub yet don't collide.
CREATE UNIQUE INDEX supporting_members_org_sub ON supporting_members (org_id, vipps_sub);

-- The arrangement a supporter agrees to once: a yearly payment that continues
-- until they end it. One agreement spans many periods; it is the thing Vipps
-- knows about, and the thing a member stops from their Vipps app.
CREATE TABLE membership_agreements (
	id TEXT PRIMARY KEY,
	org_id TEXT NOT NULL REFERENCES organizations(id),
	-- NULL between drafting and activation: until Vipps confirms, we have no
	-- consent to a profile and therefore no person to point at.
	member_id TEXT REFERENCES supporting_members(id),
	tier_id TEXT NOT NULL REFERENCES membership_tiers(id),
	vipps_agreement_id TEXT NOT NULL,
	-- Our own key on the agreement, mirrored to Vipps' externalId.
	external_id TEXT NOT NULL,
	-- PENDING | ACTIVE | STOPPED | EXPIRED — mirrors Vipps, never set by hand.
	status TEXT NOT NULL DEFAULT 'PENDING',
	-- The tier's annual fee when the agreement was made; renewals are charged
	-- at the tier's current fee, which is why both exist.
	annual_fee_nok INTEGER NOT NULL,
	vipps_sub TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	activated_at TEXT,
	stopped_at TEXT
);

CREATE UNIQUE INDEX membership_agreements_vipps ON membership_agreements (vipps_agreement_id);
CREATE INDEX membership_agreements_org ON membership_agreements (org_id, status);
CREATE INDEX membership_agreements_member ON membership_agreements (member_id);

-- One membership = one supporter, one organization, one calendar year. Created
-- only when money for that year has actually been captured; status (active vs
-- lapsed) is derived from period_year, never stored.
CREATE TABLE memberships (
	id TEXT PRIMARY KEY,
	org_id TEXT NOT NULL REFERENCES organizations(id),
	member_id TEXT NOT NULL REFERENCES supporting_members(id),
	agreement_id TEXT REFERENCES membership_agreements(id),
	tier_id TEXT NOT NULL REFERENCES membership_tiers(id),
	-- The tier's name as it was when paid, so renaming or archiving a tier
	-- never rewrites history.
	tier_name TEXT NOT NULL,
	period_year INTEGER NOT NULL,
	-- The join date in the first (partial) year, 1 January on every renewal.
	period_start TEXT NOT NULL,
	period_end TEXT NOT NULL,
	-- The tier's full annual fee for that year...
	annual_fee_nok INTEGER NOT NULL,
	-- ...and what was actually paid: pro-rated for a mid-year join.
	paid_nok INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- At most one membership per supporting member per annual period.
CREATE UNIQUE INDEX memberships_member_period ON memberships (member_id, period_year);
CREATE INDEX memberships_org_period ON memberships (org_id, period_year);

-- Every payment Vipps attempted for an agreement, in whatever state it reached.
-- Kept even when it failed: a failed renewal is why a membership lapsed, and
-- the captured ones are the organization's books.
CREATE TABLE membership_charges (
	id TEXT PRIMARY KEY,
	org_id TEXT NOT NULL REFERENCES organizations(id),
	agreement_id TEXT NOT NULL REFERENCES membership_agreements(id),
	-- Set once the charge is captured and the period it paid for exists.
	membership_id TEXT REFERENCES memberships(id),
	vipps_charge_id TEXT NOT NULL,
	external_id TEXT,
	-- The calendar year this payment buys.
	period_year INTEGER NOT NULL,
	-- INITIAL (the join) | RECURRING (a renewal).
	type TEXT NOT NULL,
	-- PENDING | DUE | CHARGED | FAILED | CANCELLED | REFUNDED | … — Vipps' word.
	status TEXT NOT NULL,
	amount_nok INTEGER NOT NULL,
	due TEXT NOT NULL,
	captured_at TEXT,
	failure_reason TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Webhook deliveries are at-least-once, so the charge id is the idempotency key.
CREATE UNIQUE INDEX membership_charges_vipps ON membership_charges (vipps_charge_id);
CREATE INDEX membership_charges_agreement ON membership_charges (agreement_id);
CREATE INDEX membership_charges_org_period ON membership_charges (org_id, period_year);
