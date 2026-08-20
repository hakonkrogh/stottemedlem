import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Organizations — 1:1 with a WorkOS organization (the identity/tenancy source),
 * this table is the system of record for everything product-side: the stable
 * public slug and the public profile the join page shows
 * (specs/concepts/join-page.md). Vipps sales-unit config (MSN, keys)
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
  /** Norwegian organisasjonsnummer (9 digits), required on the join page. */
  orgnr: text("orgnr"),
  /** Public contact address shown on the join page and in sales terms. */
  contactEmail: text("contact_email"),
  /**
   * LEGACY single annual fee in whole NOK. Superseded by membership tiers
   * (migration 0004 backfilled it into a tier); kept because migrations are
   * additive. New code reads/writes tiers, never this column.
   */
  annualFeeNok: integer("annual_fee_nok"),
  /** R2 object key for the uploaded logo; null when none uploaded. */
  logoKey: text("logo_key"),
  /** R2 object key for the uploaded banner image; null when none uploaded. */
  bannerKey: text("banner_key"),
  /**
   * Banner focal point as object-position percentages (0–100): which part of
   * the image stays in view when cropped to the wide backdrop. Null = center.
   */
  bannerFocusX: integer("banner_focus_x"),
  bannerFocusY: integer("banner_focus_y"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

/**
 * Membership tiers (specs/concepts/membership-tier.md) — the organization's
 * catalogue of supporting-membership levels. The product is the catalogue's
 * system of record (Vipps has no product-catalogue API); each tier is
 * projected onto the Vipps agreements created for it. `key` is the stable
 * per-org identifier assigned at creation and never changed; tiers are
 * archived, never deleted, because memberships reference them.
 */
export const membershipTiers = sqliteTable("membership_tiers", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  /** Stable URL-safe identifier, unique within the org. Never changes. */
  key: text("key").notNull(),
  /** Tier name; ≤45 chars so it fits a Vipps agreement's productName. */
  name: text("name").notNull(),
  /** Optional description; ≤100 chars so it fits Vipps' productDescription. */
  description: text("description"),
  /** The tier's annual fee in whole NOK (specs/concepts/annual-fee.md). */
  annualFeeNok: integer("annual_fee_nok").notNull(),
  /** Set when the tier is archived; archived tiers are hidden, never deleted. */
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type MembershipTier = typeof membershipTiers.$inferSelect;
export type NewMembershipTier = typeof membershipTiers.$inferInsert;
