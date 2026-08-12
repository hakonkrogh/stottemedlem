import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Organizations — 1:1 with a WorkOS organization (the identity/tenancy source),
 * this table is the system of record for everything product-side: the stable
 * public slug and the public profile the org landing page shows
 * (specs/concepts/org-landing-page.md). Vipps sales-unit config (MSN, keys)
 * lands here in a later scaffolding step.
 *
 * Migrations are hand-written SQL in packages/db/migrations/, applied with
 * `wrangler d1 migrations apply` (see packages/db/README.md) — keep this
 * schema and the migrations in sync.
 */
export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  workosOrgId: text("workos_org_id").notNull().unique(),
  /** Public-facing name supporters recognize; mirrors the WorkOS org name. */
  name: text("name").notNull(),
  /** Stable, unique, URL-safe identifier. Never changes once assigned. */
  slug: text("slug").notNull().unique(),
  /** Norwegian organisasjonsnummer (9 digits), required on the landing page. */
  orgnr: text("orgnr"),
  /** Public contact address shown on the landing page and in sales terms. */
  contactEmail: text("contact_email"),
  /** The annual fee in whole NOK (specs/concepts/annual-fee.md). */
  annualFeeNok: integer("annual_fee_nok"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
