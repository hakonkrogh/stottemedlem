-- Membership tiers (specs/concepts/membership-tier.md): the organization's
-- catalogue of supporting-membership levels. The product hosts this catalogue
-- (Vipps has no product-catalogue API); each tier is projected onto the Vipps
-- agreements created for it via productName/productDescription/externalId.
-- `key` is the tier's stable identifier: assigned at creation, unique per org,
-- never changed. Tiers are archived (archived_at set), never deleted.
CREATE TABLE membership_tiers (
	id TEXT PRIMARY KEY,
	org_id TEXT NOT NULL REFERENCES organizations(id),
	key TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT,
	annual_fee_nok INTEGER NOT NULL,
	archived_at TEXT,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX membership_tiers_org_key ON membership_tiers (org_id, key);
CREATE INDEX membership_tiers_org ON membership_tiers (org_id);

-- Backfill: organizations that already set the single annual fee get one tier
-- carrying it, named like the offer their landing page showed. The key matches
-- what membershipTierKey("Støttemedlemskap") derives.
INSERT INTO membership_tiers (id, org_id, key, name, annual_fee_nok)
SELECT lower(hex(randomblob(16))), id, 'stottemedlemskap', 'Støttemedlemskap', annual_fee_nok
FROM organizations
WHERE annual_fee_nok IS NOT NULL;
