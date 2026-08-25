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

/**
 * Supporting members (specs/concepts/supporting-member.md) — the person backing
 * an organization, modelled separately from any single year's payment so their
 * support accumulates across periods instead of creating a duplicate person
 * each year. Identity is captured at joining, from the payment provider's
 * profile with the supporter's consent, and never re-fetched.
 */
export const supportingMembers = sqliteTable("supporting_members", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  /** Vipps' opaque per-user id — how a returning supporter is recognized. */
  vippsSub: text("vipps_sub"),
  /**
   * When the member declined the organization's own messages
   * (specs/concepts/org-message.md). Null = may be contacted. Member notices
   * ignore this on purpose: declining news never declines being told what you
   * will be charged.
   */
  messagesDeclinedAt: text("messages_declined_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type SupportingMember = typeof supportingMembers.$inferSelect;
export type NewSupportingMember = typeof supportingMembers.$inferInsert;

/** Mirrors Vipps' agreement statuses; the product never sets one by hand. */
export type AgreementStatus = "PENDING" | "ACTIVE" | "STOPPED" | "EXPIRED";

/**
 * The standing arrangement a supporter agrees to once: a yearly payment that
 * continues until they end it (specs/use-cases/renew-annual-membership.md).
 * One agreement spans many annual periods.
 */
export const membershipAgreements = sqliteTable("membership_agreements", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  /** Null between drafting and activation — before consent there is no person. */
  memberId: text("member_id").references(() => supportingMembers.id),
  tierId: text("tier_id")
    .notNull()
    .references(() => membershipTiers.id),
  vippsAgreementId: text("vipps_agreement_id").notNull(),
  /** Our key on the agreement, mirrored to Vipps' externalId. */
  externalId: text("external_id").notNull(),
  status: text("status").$type<AgreementStatus>().notNull().default("PENDING"),
  /** The tier's annual fee when the agreement was made. */
  annualFeeNok: integer("annual_fee_nok").notNull(),
  vippsSub: text("vipps_sub"),
  /**
   * Unguessable token in the agreement's management URL, which the member
   * opens from their Vipps app. It stands in for a login: whoever holds it is
   * the member, so it must never appear anywhere the member did not put it.
   */
  manageToken: text("manage_token"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  activatedAt: text("activated_at"),
  stoppedAt: text("stopped_at"),
  /**
   * When this agreement was last read back from Vipps rather than merely heard
   * about (specs/concepts/payment-reconciliation.md). Null = never; sorting on
   * it is what makes the nightly sweep visit everyone in turn.
   */
  lastReconciledAt: text("last_reconciled_at"),
});

export type MembershipAgreement = typeof membershipAgreements.$inferSelect;
export type NewMembershipAgreement = typeof membershipAgreements.$inferInsert;

/**
 * Memberships (specs/concepts/membership.md) — one supporter, one organization,
 * one annual period (a calendar year, specs/concepts/annual-period.md). A row
 * exists only because money for that year was captured; active vs lapsed is
 * derived from `periodYear`, never stored.
 */
export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  memberId: text("member_id")
    .notNull()
    .references(() => supportingMembers.id),
  agreementId: text("agreement_id").references(() => membershipAgreements.id),
  tierId: text("tier_id")
    .notNull()
    .references(() => membershipTiers.id),
  /** The tier's name as it was when paid — renames never rewrite history. */
  tierName: text("tier_name").notNull(),
  periodYear: integer("period_year").notNull(),
  /** Join date in the first (partial) year, 1 January on every renewal. */
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  /** The tier's full annual fee for that year… */
  annualFeeNok: integer("annual_fee_nok").notNull(),
  /** …and what was actually paid: pro-rated for a mid-year join. */
  paidNok: integer("paid_nok").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

/** Vipps' charge statuses, as delivered on webhooks and charge lookups. */
export type ChargeStatus =
  | "PENDING"
  | "DUE"
  | "RESERVED"
  | "CHARGED"
  | "PARTIALLY_CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "PROCESSING";

/**
 * Every payment attempted for an agreement, in whatever state it reached — the
 * organization's books, and the reason a membership lapsed when one failed.
 * The Vipps charge id is the idempotency key: webhook delivery is at-least-once.
 */
export const membershipCharges = sqliteTable("membership_charges", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  agreementId: text("agreement_id")
    .notNull()
    .references(() => membershipAgreements.id),
  /** Set once captured and the period it paid for exists. */
  membershipId: text("membership_id").references(() => memberships.id),
  vippsChargeId: text("vipps_charge_id").notNull(),
  externalId: text("external_id"),
  /** The calendar year this payment buys. */
  periodYear: integer("period_year").notNull(),
  type: text("type").$type<"INITIAL" | "RECURRING">().notNull(),
  status: text("status").$type<ChargeStatus>().notNull(),
  amountNok: integer("amount_nok").notNull(),
  due: text("due").notNull(),
  capturedAt: text("captured_at"),
  failureReason: text("failure_reason"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type MembershipCharge = typeof membershipCharges.$inferSelect;
export type NewMembershipCharge = typeof membershipCharges.$inferInsert;

/**
 * The kinds of thing the product tells a member about their own membership.
 * Necessary notices, not the organization's own messages
 * (specs/concepts/member-notice.md).
 */
export type MemberNoticeKind = "fee-change";

/**
 * Notices actually delivered to a supporting member.
 *
 * A row exists only for a message that went out, which is what makes it
 * evidence: it answers "was this member told, and when?", and that answer
 * decides what they may be charged at their next renewal
 * (specs/use-cases/change-the-annual-fee.md). A failed send records nothing
 * and is retried, rather than quietly counting as having told them.
 */
export const memberNotices = sqliteTable("member_notices", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  memberId: text("member_id")
    .notNull()
    .references(() => supportingMembers.id),
  agreementId: text("agreement_id").references(() => membershipAgreements.id),
  kind: text("kind").$type<MemberNoticeKind>().notNull(),
  tierId: text("tier_id").references(() => membershipTiers.id),
  /** The annual fee announced, and the one the member knew before it. */
  feeNok: integer("fee_nok"),
  previousFeeNok: integer("previous_fee_nok"),
  sentAt: text("sent_at").notNull().default(sql`(datetime('now'))`),
});

export type MemberNotice = typeof memberNotices.$inferSelect;
export type NewMemberNotice = typeof memberNotices.$inferInsert;

/**
 * Who an organization message goes to: current members by default, lapsed
 * members only as a deliberate choice (specs/concepts/org-message.md).
 */
export type OrgMessageAudience = "active" | "all";

/**
 * The organization's own messages to its supporting members
 * (specs/concepts/org-message.md) — composed by an administrator, delivered by
 * the product. The audience is a rule, never a stored recipient list: who the
 * message reaches is derived from the live register when it is sent.
 */
export const orgMessages = sqliteTable("org_messages", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  subject: text("subject").notNull(),
  /** Plain text with blank-line paragraphs; the product offers no formatting. */
  body: text("body").notNull(),
  audience: text("audience").$type<OrgMessageAudience>().notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  /** Set when the send job finished walking the audience; null = still queued. */
  sentAt: text("sent_at"),
});

export type OrgMessage = typeof orgMessages.$inferSelect;
export type NewOrgMessage = typeof orgMessages.$inferInsert;

/** How the send job left one member: told, not accepted, or no way to reach. */
export type OrgMessageOutcome = "sent" | "failed" | "unreachable";

/**
 * One row per member the send job dealt with. The (message, member) uniqueness
 * is what makes a retried send idempotent: a member already dealt with is
 * never contacted twice for the same message.
 */
export const orgMessageRecipients = sqliteTable("org_message_recipients", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => orgMessages.id),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  memberId: text("member_id")
    .notNull()
    .references(() => supportingMembers.id),
  outcome: text("outcome").$type<OrgMessageOutcome>().notNull(),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type OrgMessageRecipient = typeof orgMessageRecipients.$inferSelect;
export type NewOrgMessageRecipient = typeof orgMessageRecipients.$inferInsert;
