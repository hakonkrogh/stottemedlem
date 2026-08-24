/**
 * @stottemedlem/db — D1 schema (Drizzle) + query helpers.
 *
 * Consumed by apps/backoffice only. `createDb` wraps the Worker's D1 binding;
 * the repository functions below are the only place SQL for the organizations
 * table lives.
 */
import type { D1Database } from "@cloudflare/workers-types";
import { membershipTierKey, slugifyOrganizationName } from "@stottemedlem/core";
import { and, asc, desc, eq, gte, inArray, isNull, like, lt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  type AgreementStatus,
  type ChargeStatus,
  type Membership,
  type MembershipAgreement,
  type MembershipCharge,
  type MembershipTier,
  membershipAgreements,
  membershipCharges,
  memberships,
  membershipTiers,
  type Organization,
  organizations,
  type SupportingMember,
  supportingMembers,
} from "./schema.js";

export {
  type AgreementStatus,
  type ChargeStatus,
  type Membership,
  type MembershipAgreement,
  type MembershipCharge,
  type MembershipTier,
  membershipAgreements,
  membershipCharges,
  memberships,
  membershipTiers,
  type NewMembership,
  type NewMembershipAgreement,
  type NewMembershipCharge,
  type NewMembershipTier,
  type NewOrganization,
  type NewSupportingMember,
  type Organization,
  organizations,
  type SupportingMember,
  supportingMembers,
} from "./schema.js";

export type Db = ReturnType<typeof createDb>;

/** Wrap the Worker's D1 binding in a typed Drizzle client. */
export function createDb(d1: D1Database) {
  return drizzle(d1, {
    schema: {
      organizations,
      membershipTiers,
      supportingMembers,
      membershipAgreements,
      memberships,
      membershipCharges,
    },
  });
}

/** The profile fields the Vipps order form requires the join page to show. */
export interface OrganizationProfile {
  orgnr: string | null;
  contactEmail: string | null;
}

/**
 * Whether the organization has everything its public join page must show to
 * pass Vipps' website verification: org.nr, contact info, and at least one
 * membership tier with its price. Incomplete orgs get fill-in prompts in the
 * back office.
 */
export function isProfileComplete(org: Organization, activeTierCount: number): boolean {
  return org.orgnr !== null && org.contactEmail !== null && activeTierCount > 0;
}

export async function getOrganizationBySlug(db: Db, slug: string): Promise<Organization | null> {
  const [row] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return row ?? null;
}

export async function getOrganizationByWorkosId(
  db: Db,
  workosOrgId: string,
): Promise<Organization | null> {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.workosOrgId, workosOrgId))
    .limit(1);
  return row ?? null;
}

/**
 * First free slug for a name: the slugified name, or `-2`, `-3`, … when taken.
 * The slug is assigned once and never changes afterwards (printed QR codes and
 * the Vipps-registered join page URL depend on it).
 */
async function availableSlug(db: Db, name: string): Promise<string> {
  const base = slugifyOrganizationName(name);
  const taken = new Set(
    (
      await db
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(like(organizations.slug, `${base}%`))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Get the organization row for a WorkOS org, creating it (with a freshly
 * assigned unique slug) if it does not exist yet. The create path covers both
 * new organizations and the backfill of orgs that predate this table.
 */
export async function ensureOrganization(
  db: Db,
  workosOrgId: string,
  name: string,
  profile?: Partial<OrganizationProfile>,
): Promise<Organization> {
  const existing = await getOrganizationByWorkosId(db, workosOrgId);
  if (existing) return existing;
  const slug = await availableSlug(db, name);
  const [row] = await db
    .insert(organizations)
    .values({
      id: crypto.randomUUID(),
      workosOrgId,
      name,
      slug,
      orgnr: profile?.orgnr ?? null,
      contactEmail: profile?.contactEmail ?? null,
    })
    .returning();
  if (!row) throw new Error("insert into organizations returned no row");
  return row;
}

/**
 * The organization's uploaded visual identity (specs/concepts/join-page.md):
 * R2 object keys for the logo and banner. Unlike the profile fields these are
 * optional — the join page omits what is absent.
 */
export interface OrganizationImages {
  logoKey: string | null;
  bannerKey: string | null;
  /** Banner focal point (object-position percentages, 0–100). Null = center. */
  bannerFocusX: number | null;
  bannerFocusY: number | null;
}

/** Update the public profile (and optionally the mirrored name). Slug never changes. */
export async function updateOrganizationProfile(
  db: Db,
  workosOrgId: string,
  profile: Partial<OrganizationProfile> & { name?: string } & Partial<OrganizationImages>,
): Promise<Organization | null> {
  const [row] = await db
    .update(organizations)
    .set(profile)
    .where(eq(organizations.workosOrgId, workosOrgId))
    .returning();
  return row ?? null;
}

// --- Membership tiers (specs/concepts/membership-tier.md) --------------------

/** The tier fields an administrator edits; everything else is assigned. */
export interface MembershipTierInput {
  name: string;
  description: string | null;
  annualFeeNok: number;
}

/** The organization's active (non-archived) tiers, cheapest first. */
export async function listMembershipTiers(db: Db, orgId: string): Promise<MembershipTier[]> {
  return db
    .select()
    .from(membershipTiers)
    .where(and(eq(membershipTiers.orgId, orgId), isNull(membershipTiers.archivedAt)))
    .orderBy(asc(membershipTiers.annualFeeNok), asc(membershipTiers.createdAt));
}

/**
 * First free tier key for a name within the org: the derived key, or `-2`,
 * `-3`, … when taken (archived tiers keep their keys reserved). Assigned once
 * at creation and never changed — Vipps agreements and join links carry it.
 */
async function availableTierKey(db: Db, orgId: string, name: string): Promise<string> {
  const base = membershipTierKey(name);
  const taken = new Set(
    (
      await db
        .select({ key: membershipTiers.key })
        .from(membershipTiers)
        .where(and(eq(membershipTiers.orgId, orgId), like(membershipTiers.key, `${base}%`)))
    ).map((r) => r.key),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function createMembershipTier(
  db: Db,
  orgId: string,
  input: MembershipTierInput,
): Promise<MembershipTier> {
  const key = await availableTierKey(db, orgId, input.name);
  const [row] = await db
    .insert(membershipTiers)
    .values({ id: crypto.randomUUID(), orgId, key, ...input })
    .returning();
  if (!row) throw new Error("insert into membership_tiers returned no row");
  return row;
}

/** Update a tier's editable fields. The key is immutable by design. */
export async function updateMembershipTier(
  db: Db,
  orgId: string,
  tierId: string,
  input: MembershipTierInput,
): Promise<MembershipTier | null> {
  const [row] = await db
    .update(membershipTiers)
    .set(input)
    .where(and(eq(membershipTiers.id, tierId), eq(membershipTiers.orgId, orgId)))
    .returning();
  return row ?? null;
}

/**
 * Archive a tier: hidden from the public offer, kept for membership history.
 * Refuses to archive the organization's last active tier — an organization
 * always offers at least one membership (specs/concepts/membership-tier.md).
 */
export async function archiveMembershipTier(
  db: Db,
  orgId: string,
  tierId: string,
): Promise<MembershipTier | null> {
  const active = await listMembershipTiers(db, orgId);
  if (active.length <= 1) return null;
  const [row] = await db
    .update(membershipTiers)
    .set({ archivedAt: new Date().toISOString() })
    .where(
      and(
        eq(membershipTiers.id, tierId),
        eq(membershipTiers.orgId, orgId),
        isNull(membershipTiers.archivedAt),
      ),
    )
    .returning();
  return row ?? null;
}

// --- The member registry (specs/concepts/membership.md) ----------------------
//
// Vipps is authoritative for money; these tables are authoritative for who
// supports whom. Everything here is written in response to something Vipps
// reported — never to a supporter merely arriving back on a page — and every
// write is idempotent, because webhook delivery is at-least-once.

/** A membership is active while its calendar year is the current one. */
export function membershipStatus(
  periodYear: number,
  today: Date = new Date(),
): "active" | "lapsed" {
  return periodYear >= today.getUTCFullYear() ? "active" : "lapsed";
}

/** What a supporter agreed to, before Vipps has confirmed anything. */
export interface DraftedAgreement {
  orgId: string;
  tierId: string;
  vippsAgreementId: string;
  externalId: string;
  annualFeeNok: number;
  /** Secret in the member's own management URL; generated when absent. */
  manageToken?: string;
}

/**
 * Remember an agreement the moment it is drafted, so a supporter returning
 * from Vipps — or a webhook arriving first — always finds it. Re-drafting with
 * the same Vipps id is a no-op.
 */
export async function recordDraftedAgreement(
  db: Db,
  draft: DraftedAgreement,
): Promise<MembershipAgreement> {
  await db
    .insert(membershipAgreements)
    .values({ id: crypto.randomUUID(), manageToken: crypto.randomUUID(), ...draft })
    .onConflictDoNothing({ target: membershipAgreements.vippsAgreementId });
  const agreement = await findAgreementByVippsId(db, draft.vippsAgreementId);
  if (!agreement) throw new Error("agreement disappeared right after insert");
  return agreement;
}

export async function findAgreementByVippsId(
  db: Db,
  vippsAgreementId: string,
): Promise<MembershipAgreement | null> {
  const [row] = await db
    .select()
    .from(membershipAgreements)
    .where(eq(membershipAgreements.vippsAgreementId, vippsAgreementId));
  return row ?? null;
}

/**
 * The agreement behind a management token — how the member's own page knows
 * whose membership it is showing, without a login. An unknown token yields
 * nothing at all, never a hint that some other membership exists.
 */
export async function findAgreementByManageToken(
  db: Db,
  manageToken: string,
): Promise<MembershipAgreement | null> {
  const [row] = await db
    .select()
    .from(membershipAgreements)
    .where(eq(membershipAgreements.manageToken, manageToken));
  return row ?? null;
}

/** The identity a supporter consented to share, captured once at joining. */
export interface SupporterIdentity {
  vippsSub: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * The person behind a `sub`, created on first sight. A supporter who returns
 * years later is the same member, not a duplicate — that is the whole reason
 * `sub` is stored. Consented details refresh only when actually supplied, so a
 * renewal (which carries none) never blanks what joining captured.
 */
export async function ensureSupportingMember(
  db: Db,
  orgId: string,
  identity: SupporterIdentity,
): Promise<SupportingMember> {
  const [existing] = await db
    .select()
    .from(supportingMembers)
    .where(
      and(eq(supportingMembers.orgId, orgId), eq(supportingMembers.vippsSub, identity.vippsSub)),
    );

  const details = {
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.phone ? { phone: identity.phone } : {}),
  };

  if (existing) {
    if (Object.keys(details).length === 0) return existing;
    const [updated] = await db
      .update(supportingMembers)
      .set(details)
      .where(eq(supportingMembers.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [created] = await db
    .insert(supportingMembers)
    .values({ id: crypto.randomUUID(), orgId, vippsSub: identity.vippsSub, ...details })
    .returning();
  if (!created) throw new Error("insert into supporting_members returned no row");
  return created;
}

/**
 * Vipps confirmed the agreement: attach the person it belongs to. Called from
 * the activation webhook (and from polling, which may get there first) — safe
 * either way, and safe twice.
 */
export async function activateAgreement(
  db: Db,
  vippsAgreementId: string,
  identity: SupporterIdentity,
): Promise<{ agreement: MembershipAgreement; member: SupportingMember } | null> {
  const agreement = await findAgreementByVippsId(db, vippsAgreementId);
  if (!agreement) return null;
  const member = await ensureSupportingMember(db, agreement.orgId, identity);
  const [updated] = await db
    .update(membershipAgreements)
    .set({
      memberId: member.id,
      vippsSub: identity.vippsSub,
      status: "ACTIVE",
      activatedAt: agreement.activatedAt ?? new Date().toISOString(),
    })
    .where(eq(membershipAgreements.id, agreement.id))
    .returning();
  return { agreement: updated ?? agreement, member };
}

/**
 * The arrangement ended — by the member in their Vipps app, by the
 * organization, or by expiry. The membership already paid for keeps running to
 * 31 December; only the continuation stops.
 */
export async function closeAgreement(
  db: Db,
  vippsAgreementId: string,
  status: Extract<AgreementStatus, "STOPPED" | "EXPIRED">,
): Promise<MembershipAgreement | null> {
  const [row] = await db
    .update(membershipAgreements)
    .set({ status, stoppedAt: new Date().toISOString() })
    .where(eq(membershipAgreements.vippsAgreementId, vippsAgreementId))
    .returning();
  return row ?? null;
}

/** A payment Vipps told us about, in whatever state it has reached. */
export interface ChargeReport {
  vippsChargeId: string;
  externalId?: string | null;
  periodYear: number;
  type: "INITIAL" | "RECURRING";
  status: ChargeStatus;
  amountNok: number;
  due: string;
  failureReason?: string | null;
}

/**
 * Record or update one payment against its agreement. The Vipps charge id is
 * the idempotency key, so a redelivered webhook updates the same row instead
 * of duplicating the books.
 */
export async function recordCharge(
  db: Db,
  vippsAgreementId: string,
  report: ChargeReport,
): Promise<MembershipCharge | null> {
  const agreement = await findAgreementByVippsId(db, vippsAgreementId);
  if (!agreement) return null;
  const now = new Date().toISOString();
  const capturedAt = report.status === "CHARGED" ? now : null;

  const [row] = await db
    .insert(membershipCharges)
    .values({
      id: crypto.randomUUID(),
      orgId: agreement.orgId,
      agreementId: agreement.id,
      capturedAt,
      ...report,
    })
    .onConflictDoUpdate({
      target: membershipCharges.vippsChargeId,
      set: {
        status: report.status,
        amountNok: report.amountNok,
        due: report.due,
        failureReason: report.failureReason ?? null,
        // Capture time is when it first succeeded, not when we last heard.
        ...(capturedAt ? { capturedAt: sql`coalesce(captured_at, ${capturedAt})` } : {}),
        updatedAt: now,
      },
    })
    .returning();
  return row ?? null;
}

/** What a captured payment buys: one period of one tier for one supporter. */
export interface PaidPeriod {
  periodYear: number;
  periodStart: string;
  periodEnd: string;
  annualFeeNok: number;
  paidNok: number;
}

/**
 * Money for a year actually arrived, so the membership for that year exists.
 * This is the ONLY way a membership comes into being — the supporter landing
 * back on our page proves nothing (specs/concepts/membership.md). Idempotent:
 * a second delivery of the same capture returns the membership already created.
 */
export async function grantMembershipForCapturedCharge(
  db: Db,
  vippsChargeId: string,
  period: PaidPeriod,
): Promise<Membership | null> {
  const [charge] = await db
    .select()
    .from(membershipCharges)
    .where(eq(membershipCharges.vippsChargeId, vippsChargeId));
  if (!charge) return null;

  const agreement = await db
    .select()
    .from(membershipAgreements)
    .where(eq(membershipAgreements.id, charge.agreementId))
    .then((rows) => rows[0]);
  if (!agreement?.memberId) return null;

  const [tier] = await db
    .select()
    .from(membershipTiers)
    .where(eq(membershipTiers.id, agreement.tierId));
  if (!tier) return null;

  await db
    .insert(memberships)
    .values({
      id: crypto.randomUUID(),
      orgId: agreement.orgId,
      memberId: agreement.memberId,
      agreementId: agreement.id,
      tierId: tier.id,
      tierName: tier.name,
      ...period,
    })
    // At most one membership per supporting member per annual period.
    .onConflictDoNothing({ target: [memberships.memberId, memberships.periodYear] });

  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.memberId, agreement.memberId),
        eq(memberships.periodYear, period.periodYear),
      ),
    );
  if (membership && charge.membershipId !== membership.id) {
    await db
      .update(membershipCharges)
      .set({ membershipId: membership.id })
      .where(eq(membershipCharges.id, charge.id));
  }
  return membership ?? null;
}

/**
 * Payments that succeeded but whose membership does not exist yet — the state
 * left behind when a capture is reported before the agreement has been
 * activated (Vipps delivers those two events within a second of each other,
 * in either order). Settled as soon as the person is known.
 */
export async function listUnappliedCaptures(
  db: Db,
  agreementId: string,
): Promise<MembershipCharge[]> {
  return db
    .select()
    .from(membershipCharges)
    .where(
      and(
        eq(membershipCharges.agreementId, agreementId),
        eq(membershipCharges.status, "CHARGED"),
        isNull(membershipCharges.membershipId),
      ),
    );
}

/** Every organization, for the scheduled jobs that must visit them all. */
export async function listOrganizations(db: Db): Promise<Organization[]> {
  return db.select().from(organizations).orderBy(asc(organizations.createdAt));
}

/**
 * An organization's live arrangements, each with the tier it belongs to — so a
 * job can compare what a member is signed up at against what the tier costs
 * today, and charge the current fee at renewal
 * (specs/use-cases/change-the-annual-fee.md).
 */
export async function listActiveAgreementsWithTier(
  db: Db,
  orgId: string,
): Promise<{ agreement: MembershipAgreement; tier: MembershipTier }[]> {
  return db
    .select({ agreement: membershipAgreements, tier: membershipTiers })
    .from(membershipAgreements)
    .innerJoin(membershipTiers, eq(membershipAgreements.tierId, membershipTiers.id))
    .where(and(eq(membershipAgreements.orgId, orgId), eq(membershipAgreements.status, "ACTIVE")));
}

/** How many live arrangements a tier has — what a fee change would move. */
export async function countActiveAgreementsForTier(db: Db, tierId: string): Promise<number> {
  const rows = await db
    .select({ id: membershipAgreements.id })
    .from(membershipAgreements)
    .where(and(eq(membershipAgreements.tierId, tierId), eq(membershipAgreements.status, "ACTIVE")));
  return rows.length;
}

/**
 * Record the price a member is now signed up at, after the payment provider
 * has accepted the change. Never the other way round: the provider is what
 * actually charges them.
 */
export async function updateAgreementFee(
  db: Db,
  agreementId: string,
  annualFeeNok: number,
): Promise<void> {
  await db
    .update(membershipAgreements)
    .set({ annualFeeNok })
    .where(eq(membershipAgreements.id, agreementId));
}

/**
 * The payment already arranged for a period, if any. The guard that stops a
 * renewal job creating a second charge for a year it has already handled — and
 * the reason a late fee change cannot alter a renewal a member was already
 * told about.
 */
export async function findChargeForPeriod(
  db: Db,
  agreementId: string,
  periodYear: number,
): Promise<MembershipCharge | null> {
  const [row] = await db
    .select()
    .from(membershipCharges)
    .where(
      and(
        eq(membershipCharges.agreementId, agreementId),
        eq(membershipCharges.periodYear, periodYear),
      ),
    );
  return row ?? null;
}

/** One row of the organization's member list. */
export interface MemberListEntry {
  member: SupportingMember;
  membership: Membership;
  status: "active" | "lapsed";
}

/**
 * The organization's supporting members for one annual period — the list the
 * product exists to curate. Defaults to the current calendar year.
 */
export async function listMembersForPeriod(
  db: Db,
  orgId: string,
  periodYear: number = new Date().getUTCFullYear(),
): Promise<MemberListEntry[]> {
  const rows = await db
    .select({ member: supportingMembers, membership: memberships })
    .from(memberships)
    .innerJoin(supportingMembers, eq(memberships.memberId, supportingMembers.id))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.periodYear, periodYear)))
    .orderBy(asc(supportingMembers.name), asc(memberships.createdAt));
  return rows.map((row) => ({ ...row, status: membershipStatus(row.membership.periodYear) }));
}

/** Every period a supporter has ever paid for, newest first — their history. */
export async function listMembershipHistory(db: Db, memberId: string): Promise<Membership[]> {
  return db
    .select()
    .from(memberships)
    .where(eq(memberships.memberId, memberId))
    .orderBy(desc(memberships.periodYear));
}

// ── Reconciliation (specs/concepts/payment-reconciliation.md) ───────────────

/**
 * The charge states Vipps may still move away from. A charge sitting in one of
 * these is an outcome we have not been told — which is indistinguishable, from
 * our side, from a delivery that was lost.
 */
export const OPEN_CHARGE_STATUSES: readonly ChargeStatus[] = [
  "PENDING",
  "DUE",
  "RESERVED",
  "PROCESSING",
  "PARTIALLY_CAPTURED",
];

/** Why an agreement is in tonight's sweep — carried through to the job's log. */
export type ReconcileReason =
  | "unheard-outcome"
  | "unsettled-capture"
  | "awaiting-approval"
  | "rotation";

export interface AgreementToReconcile {
  agreement: MembershipAgreement;
  reason: ReconcileReason;
}

export interface ReconcileSelection {
  /** How far back a charge's due date may be and still be worth chasing. */
  chargeLookbackDays: number;
  /** How long an unapproved draft is still worth asking about. */
  draftLookbackDays: number;
  /** Upper bound on agreements visited in one run, so the sweep stays bounded. */
  limit: number;
  today: Date;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const daysBefore = (date: Date, days: number) =>
  new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

/**
 * Which agreements to re-read from Vipps tonight, most-suspect first:
 *
 *   1. a payment whose outcome was due and never reached us
 *   2. money that arrived but never became a membership
 *   3. a draft that may have been approved without us hearing
 *   4. everything else, oldest-check-first
 *
 * The first three are specific doubts; the fourth is the rotation that
 * guarantees every agreement is eventually checked even when nothing looks
 * wrong. The limit applies across all four, so a run's cost is predictable.
 */
export async function selectAgreementsToReconcile(
  db: Db,
  orgId: string,
  options: ReconcileSelection,
): Promise<AgreementToReconcile[]> {
  const today = isoDay(options.today);
  const chargesFrom = isoDay(daysBefore(options.today, options.chargeLookbackDays));
  const draftsFrom = isoDay(daysBefore(options.today, options.draftLookbackDays));

  const withOpenCharge = db
    .select({ agreement: membershipAgreements })
    .from(membershipAgreements)
    .innerJoin(membershipCharges, eq(membershipCharges.agreementId, membershipAgreements.id))
    .where(
      and(
        eq(membershipAgreements.orgId, orgId),
        inArray(membershipCharges.status, [...OPEN_CHARGE_STATUSES]),
        // A payment not yet due has nothing to report; one long past its
        // provider retries has stopped changing.
        lte(membershipCharges.due, today),
        gte(membershipCharges.due, chargesFrom),
      ),
    );

  const withUnsettledCapture = db
    .select({ agreement: membershipAgreements })
    .from(membershipAgreements)
    .innerJoin(membershipCharges, eq(membershipCharges.agreementId, membershipAgreements.id))
    .where(
      and(
        eq(membershipAgreements.orgId, orgId),
        eq(membershipCharges.status, "CHARGED"),
        isNull(membershipCharges.membershipId),
      ),
    );

  const awaitingApproval = db
    .select({ agreement: membershipAgreements })
    .from(membershipAgreements)
    .where(
      and(
        eq(membershipAgreements.orgId, orgId),
        eq(membershipAgreements.status, "PENDING"),
        gte(membershipAgreements.createdAt, draftsFrom),
      ),
    );

  // NULLs sort first in SQLite, so a never-checked agreement goes to the front.
  const rotation = db
    .select({ agreement: membershipAgreements })
    .from(membershipAgreements)
    .where(and(eq(membershipAgreements.orgId, orgId), eq(membershipAgreements.status, "ACTIVE")))
    .orderBy(asc(membershipAgreements.lastReconciledAt))
    .limit(options.limit);

  const groups: [ReconcileReason, { agreement: MembershipAgreement }[]][] = [
    ["unheard-outcome", await withOpenCharge],
    ["unsettled-capture", await withUnsettledCapture],
    ["awaiting-approval", await awaitingApproval],
    ["rotation", await rotation],
  ];

  const picked = new Map<string, AgreementToReconcile>();
  for (const [reason, rows] of groups) {
    for (const { agreement } of rows) {
      if (picked.size >= options.limit) break;
      if (picked.has(agreement.id)) continue;
      picked.set(agreement.id, { agreement, reason });
    }
  }
  return [...picked.values()];
}

/**
 * Drafts nobody ever approved and nobody ever will. They are not deleted —
 * they are the record of an attempt — but the sweep stops asking about them,
 * so the job reports how many it is leaving behind rather than dropping them
 * silently.
 */
export async function countAbandonedDrafts(
  db: Db,
  orgId: string,
  options: { today: Date; draftLookbackDays: number },
): Promise<number> {
  const draftsFrom = isoDay(daysBefore(options.today, options.draftLookbackDays));
  const rows = await db
    .select({ id: membershipAgreements.id })
    .from(membershipAgreements)
    .where(
      and(
        eq(membershipAgreements.orgId, orgId),
        eq(membershipAgreements.status, "PENDING"),
        lt(membershipAgreements.createdAt, draftsFrom),
      ),
    );
  return rows.length;
}

/** Remember that this agreement has just been read back from Vipps. */
export async function markAgreementReconciled(
  db: Db,
  agreementId: string,
  at: Date = new Date(),
): Promise<void> {
  await db
    .update(membershipAgreements)
    .set({ lastReconciledAt: at.toISOString() })
    .where(eq(membershipAgreements.id, agreementId));
}

/** Every charge we have recorded against an agreement, by Vipps' charge id. */
export async function listChargesForAgreement(
  db: Db,
  agreementId: string,
): Promise<MembershipCharge[]> {
  return db
    .select()
    .from(membershipCharges)
    .where(eq(membershipCharges.agreementId, agreementId))
    .orderBy(asc(membershipCharges.due));
}
