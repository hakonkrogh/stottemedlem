-- Organizations: 1:1 with a WorkOS organization; stable public slug + the
-- public profile shown on the org landing page (specs/concepts/org-landing-page.md).
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  workos_org_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  orgnr TEXT,
  contact_email TEXT,
  annual_fee_nok INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
