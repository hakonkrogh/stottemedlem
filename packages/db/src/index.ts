/**
 * @stottemedlem/db — D1 schema (Drizzle) + query helpers.
 *
 * Consumed by apps/backoffice only. `createDb` wraps the Worker's D1 binding;
 * the repository functions below are the only place SQL for the organizations
 * table lives.
 */
import type { D1Database } from "@cloudflare/workers-types";
import { membershipTierKey, slugifyOrganizationName } from "@stottemedlem/core";
import { and, asc, desc, eq, gte, inArray, isNull, like, lt, lte, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  type AgreementStatus,
  type ChargeStatus,
  type MemberNotice,
  type MemberNoticeKind,
  type Membership,
  type MembershipAgreement,
  type MembershipCharge,
  type MembershipTier,
  memberNotices,
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
  type MemberNotice,
  type MemberNoticeKind,
  type Membership,
  type MembershipAgreement,
  type MembershipCharge,
  type MembershipTier,
  memberNotices,
  membershipAgreements,
  membershipCharges,
  memberships,
  membershipTiers,
  type NewMemberNotice,
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

/**
 * Record that an organization accepted the data processing agreement
 * (specs/concepts/data-processing-agreement.md) — at signup, or afterwards for
 * one that predates it.
 *
 * Always writes: accepting the current version again is how an organization
 * moves off an older one, so this is not "only if missing".
 */
export async function acceptDataProcessingAgreement(
  db: Db,
  orgId: string,
  version: string,
): Promise<Organization | null> {
  const [row] = await db
    .update(organizations)
    .set({ dpaAcceptedAt: new Date().toISOString(), dpaVersion: version })
    .where(eq(organizations.id, orgId))
    .returning();
  return row ?? null;
}

/**
 * Has this organization accepted the agreement that is current *now*? An
 * organization on a superseded version has not — the point of versioning it is
 * that a substantive change has to be agreed again.
 */
export function hasAcceptedDpa(org: Organization, currentVersion: string): boolean {
  return Boolean(org.dpaAcceptedAt) && org.dpaVersion === currentVersion;
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
 * One tier by id, archived or not — because history points at tiers the offer
 * no longer includes. Callers deciding what to SELL must check `archivedAt`
 * themselves; `listMembershipTiers` is the offer.
 */
export async function getMembershipTier(
  db: Db,
  orgId: string,
  tierId: string,
): Promise<MembershipTier | null> {
  const [row] = await db
    .select()
    .from(membershipTiers)
    .where(and(eq(membershipTiers.id, tierId), eq(membershipTiers.orgId, orgId)));
  return row ?? null;
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

/**
 * A membership is active while its period is the current one. What the current
 * period IS depends on the environment's period scheme (calendar year in
 * production, the ISO week on accelerated staging — see PeriodScheme in
 * @stottemedlem/core), so the caller supplies today's period key rather than
 * this package asking the calendar.
 */
export function membershipStatus(
  periodYear: number,
  currentPeriodKey: number,
): "active" | "lapsed" {
  return periodYear >= currentPeriodKey ? "active" : "lapsed";
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
  /**
   * The member whose card was scanned to get here, if any. Held on the
   * agreement because the joiner is still anonymous at this point
   * (specs/use-cases/earn-hearts-and-recruit.md).
   */
  referredByMemberId?: string | null;
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

/** One agreement by our own id — the one a recorded payment was taken under. */
export async function getMembershipAgreement(
  db: Db,
  agreementId: string,
): Promise<MembershipAgreement | null> {
  const [row] = await db
    .select()
    .from(membershipAgreements)
    .where(eq(membershipAgreements.id, agreementId));
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

/**
 * Whether this supporter has some OTHER arrangement still running.
 *
 * "Will I be charged again?" is a question about a person and their money, not
 * about one agreement — and one supporter can hold several. Stopping and
 * joining again drafts a NEW agreement rather than reviving the old one, so a
 * member can hold a stopped one and a live one at the same time (seen on
 * staging 27.8.2026, 41 seconds apart). Answering from the stopped agreement
 * alone would promise that no more money will be taken while the other one
 * renews on schedule.
 */
export async function hasOtherRunningAgreement(
  db: Db,
  memberId: string,
  exceptAgreementId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: membershipAgreements.id })
    .from(membershipAgreements)
    .where(
      and(
        eq(membershipAgreements.memberId, memberId),
        eq(membershipAgreements.status, "ACTIVE"),
        ne(membershipAgreements.id, exceptAgreementId),
      ),
    );
  return Boolean(row);
}

/** The identity a supporter consented to share, captured once at joining. */
export interface SupporterIdentity {
  vippsSub: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  /**
   * Who brought them in, when the join began by scanning a card. Only ever
   * applied to a person we are meeting for the first time: someone who has
   * supported this organization before was not recruited today, and a recruit
   * belongs to at most one recruiter (specs/concepts/scorecard.md).
   */
  referredByMemberId?: string | null;
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
    .values({
      id: crypto.randomUUID(),
      orgId,
      vippsSub: identity.vippsSub,
      // Every member has a card from the moment they exist
      // (specs/concepts/member-card.md).
      cardToken: crypto.randomUUID(),
      referredByMemberId: identity.referredByMemberId ?? null,
      ...details,
    })
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
  // The referral was captured when the agreement was drafted, before anyone
  // knew who was joining; now that they have a name, it can follow them.
  const member = await ensureSupportingMember(db, agreement.orgId, {
    referredByMemberId: agreement.referredByMemberId,
    ...identity,
  });
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
 * Who a fee change would move, and how many of them the product could not tell
 * about it. An organization is shown the second number *before* it changes a
 * price, because members it cannot reach are members it must reach itself
 * (specs/use-cases/change-the-annual-fee.md).
 */
export async function tierMemberReach(
  db: Db,
  tierId: string,
): Promise<{ members: number; unreachable: number }> {
  const rows = await db
    .select({ email: supportingMembers.email })
    .from(membershipAgreements)
    .innerJoin(supportingMembers, eq(membershipAgreements.memberId, supportingMembers.id))
    .where(and(eq(membershipAgreements.tierId, tierId), eq(membershipAgreements.status, "ACTIVE")));
  return {
    members: rows.length,
    unreachable: rows.filter((row) => !row.email?.trim()).length,
  };
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
 * Point an existing arrangement at a different tier
 * (specs/use-cases/change-membership-tier.md). The arrangement itself is not
 * replaced — a member changing what they give is not a member leaving and
 * coming back — so its id, its Vipps agreement and its manage token all stay
 * exactly as they were. Only what it is FOR changes.
 */
export async function moveAgreementToTier(
  db: Db,
  agreementId: string,
  tier: { tierId: string; annualFeeNok: number; externalId: string },
): Promise<void> {
  await db
    .update(membershipAgreements)
    .set({
      tierId: tier.tierId,
      annualFeeNok: tier.annualFeeNok,
      externalId: tier.externalId,
    })
    .where(eq(membershipAgreements.id, agreementId));
}

/**
 * Write down that the member chose this price for themselves, which is what
 * lets the next renewal actually charge it.
 *
 * Without this the renewal falls back to what they LAST PAID
 * (`listMemberFeeStandings`), so a member who moved up a tier would quietly be
 * charged the old amount for another year. Recording the choice is therefore
 * not bookkeeping — it is the half of the change that makes it real.
 *
 * Records nothing when the member's newest record for this tier already says
 * the same, so a repeated settle or a double press cannot pile up rows.
 * Returns whether anything was written.
 */
export async function recordFeeChoice(
  db: Db,
  choice: {
    orgId: string;
    memberId: string;
    agreementId: string;
    tierId: string;
    feeNok: number;
    previousFeeNok: number | null;
  },
): Promise<boolean> {
  const [newest] = await db
    .select()
    .from(memberNotices)
    .where(
      and(
        eq(memberNotices.memberId, choice.memberId),
        eq(memberNotices.tierId, choice.tierId),
        inArray(memberNotices.kind, ["fee-change", "tier-choice"]),
      ),
    )
    .orderBy(desc(memberNotices.sentAt))
    .limit(1);
  if (newest?.kind === "tier-choice" && newest.feeNok === choice.feeNok) return false;

  const { previousFeeNok, ...rest } = choice;
  await recordMemberNotice(db, {
    ...rest,
    kind: "tier-choice",
    ...(previousFeeNok === null ? {} : { previousFeeNok }),
  });
  return true;
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

/** One recorded payment, by the id Vipps knows it as. */
export async function findChargeByVippsId(
  db: Db,
  vippsChargeId: string,
): Promise<MembershipCharge | null> {
  const [row] = await db
    .select()
    .from(membershipCharges)
    .where(eq(membershipCharges.vippsChargeId, vippsChargeId));
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
  periodYear: number,
  currentPeriodKey: number = periodYear,
): Promise<MemberListEntry[]> {
  const rows = await db
    .select({ member: supportingMembers, membership: memberships })
    .from(memberships)
    .innerJoin(supportingMembers, eq(memberships.memberId, supportingMembers.id))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.periodYear, periodYear)))
    .orderBy(asc(supportingMembers.name), asc(memberships.createdAt));
  return rows.map((row) => ({
    ...row,
    status: membershipStatus(row.membership.periodYear, currentPeriodKey),
  }));
}

/** Every period a supporter has ever paid for, newest first — their history. */
export async function listMembershipHistory(db: Db, memberId: string): Promise<Membership[]> {
  return db
    .select()
    .from(memberships)
    .where(eq(memberships.memberId, memberId))
    .orderBy(desc(memberships.periodYear));
}

/**
 * Every payment ever attempted for one supporter, newest first — the money
 * behind their history, including the attempts that bought nothing. This is
 * what an administrator is shown before giving one back
 * (specs/use-cases/refund-a-payment.md).
 */
export async function listChargesForMember(db: Db, memberId: string): Promise<MembershipCharge[]> {
  return db
    .select({ charge: membershipCharges })
    .from(membershipCharges)
    .innerJoin(membershipAgreements, eq(membershipCharges.agreementId, membershipAgreements.id))
    .where(eq(membershipAgreements.memberId, memberId))
    .orderBy(desc(membershipCharges.due), desc(membershipCharges.createdAt))
    .then((rows) => rows.map((row) => row.charge));
}

/**
 * The money went back, so the year it bought was not supported after all: the
 * membership ceases to exist (specs/concepts/membership.md — the period follows
 * the money in both directions).
 *
 * The mirror of grantMembershipForCapturedCharge, and idempotent in the same
 * way: whoever reports the refund first — our own refund action, the webhook,
 * the nightly sweep, or an administrator refunding in Vipps' portal — every
 * later report finds the period already gone and changes nothing.
 *
 * Only a FULL refund revokes. The books are untouched: the charge row keeps its
 * amount and its now-refunded status, so "what happened to this person's money"
 * stays answerable, and the supporter themselves is never deleted.
 */
export async function revokeMembershipForRefundedCharge(
  db: Db,
  vippsChargeId: string,
): Promise<Membership | null> {
  const [charge] = await db
    .select()
    .from(membershipCharges)
    .where(eq(membershipCharges.vippsChargeId, vippsChargeId));
  if (!charge?.membershipId) return null;

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.id, charge.membershipId));

  // Let go of the period first: a charge row may not point at a membership
  // that is about to stop existing.
  await db
    .update(membershipCharges)
    .set({ membershipId: null, updatedAt: new Date().toISOString() })
    .where(eq(membershipCharges.id, charge.id));

  // A period paid for twice keeps standing on the payment that was not given
  // back — refunding one of them buys nobody's year away.
  const others = await db
    .select({ id: membershipCharges.id })
    .from(membershipCharges)
    .where(eq(membershipCharges.membershipId, charge.membershipId));
  if (others.length > 0) return null;

  await db.delete(memberships).where(eq(memberships.id, charge.membershipId));
  return membership ?? null;
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

// ── The member list (specs/use-cases/curate-member-list.md) ─────────────────

/** One supporting member as the organization sees them in its list. */
export interface MemberOverview {
  member: SupportingMember;
  /** The most recent period they have paid for; null if none ever completed. */
  latest: Membership | null;
  /** Derived from that period, never stored and never set by an administrator. */
  status: "active" | "lapsed";
  /** Their yearly arrangement is still live, so next period is already covered. */
  renewing: boolean;
  /**
   * One heart per supported annual period (specs/concepts/scorecard.md) —
   * counted from the membership rows, never stored, so a fully refunded
   * period takes its heart with it.
   */
  hearts: number;
  /**
   * How many supporting members they brought in and who then paid
   * (specs/concepts/scorecard.md) — so the organization can see and thank its
   * best recruiters.
   */
  recruits: number;
}

/**
 * How many paying recruits each member of an organization brought in, keyed by
 * the recruiter. Members who have recruited nobody are simply absent.
 */
async function recruitCountsByReferrer(db: Db, orgId: string): Promise<Map<string, number>> {
  const rows = await db
    .selectDistinct({
      referrer: supportingMembers.referredByMemberId,
      recruit: supportingMembers.id,
    })
    .from(supportingMembers)
    .innerJoin(memberships, eq(memberships.memberId, supportingMembers.id))
    .where(eq(supportingMembers.orgId, orgId));

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.referrer) continue;
    counts.set(row.referrer, (counts.get(row.referrer) ?? 0) + 1);
  }
  return counts;
}

/**
 * Every supporting member of an organization, each with the latest period they
 * paid for and whether that makes them current.
 *
 * The whole list is loaded at once, and searching filters it in the page: an
 * organization's supporters number in the hundreds, and a count that changed
 * as you typed would be worse than useless. If that assumption ever breaks,
 * this is the function to push the filtering into.
 */
export async function listOrganizationMembers(
  db: Db,
  orgId: string,
  currentPeriodKey: number,
): Promise<MemberOverview[]> {
  const rows = await db
    .select({ member: supportingMembers, membership: memberships })
    .from(supportingMembers)
    .leftJoin(memberships, eq(memberships.memberId, supportingMembers.id))
    .where(eq(supportingMembers.orgId, orgId))
    .orderBy(asc(supportingMembers.name), asc(supportingMembers.createdAt));

  const live = new Set(
    (
      await db
        .select({ memberId: membershipAgreements.memberId })
        .from(membershipAgreements)
        .where(
          and(eq(membershipAgreements.orgId, orgId), eq(membershipAgreements.status, "ACTIVE")),
        )
    ).flatMap((row) => (row.memberId ? [row.memberId] : [])),
  );

  const recruits = await recruitCountsByReferrer(db, orgId);

  const byMember = new Map<string, MemberOverview>();
  for (const { member, membership } of rows) {
    const seen = byMember.get(member.id);
    const latest =
      membership && (!seen?.latest || membership.periodYear > seen.latest.periodYear)
        ? membership
        : (seen?.latest ?? null);
    byMember.set(member.id, {
      member,
      latest,
      // No completed period at all reads as lapsed: nothing has been paid, so
      // nothing is current. It is a brief state — a supporter is recorded on
      // approval, seconds before the first payment lands.
      status: latest ? membershipStatus(latest.periodYear, currentPeriodKey) : "lapsed",
      renewing: live.has(member.id),
      // Periods are unique per member and year, so each joined row is a heart.
      hearts: (seen?.hearts ?? 0) + (membership ? 1 : 0),
      recruits: recruits.get(member.id) ?? 0,
    });
  }
  return [...byMember.values()];
}

/**
 * How many supporting members are current — one number, without reading the
 * whole register. The back office carries it on the member tab from every
 * screen (specs/concepts/back-office.md), so it must stay cheap.
 */
export async function countActiveMembers(
  db: Db,
  orgId: string,
  currentPeriodKey: number,
): Promise<number> {
  const rows = await db
    .select({ memberId: memberships.memberId })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.periodYear, currentPeriodKey)));
  return new Set(rows.map((row) => row.memberId)).size;
}

/**
 * Where a supporter stands with the organization, as one word.
 *
 * Being current and continuing to support are different questions, and the
 * answer an organization acts on is the pair of them: someone who has ended
 * their arrangement is still a member until their paid period runs out, but
 * they are the one to talk to now, not next year. Two booleans state that; a
 * name is what makes it something to look for, count, and filter by
 * (specs/use-cases/curate-member-list.md).
 *
 * Derived like everything else about standing — never stored, never set by an
 * administrator.
 */
export type MemberStanding = "renewing" | "ending" | "lapsed" | "unpaid";

export function memberStanding(entry: MemberOverview): MemberStanding {
  // Never having paid comes first: a supporter recorded seconds ago has an
  // arrangement that will renew, and calling them "renewing" would claim money
  // arrived. They are current in neither direction yet.
  if (!entry.latest) return "unpaid";
  if (entry.status === "lapsed") return "lapsed";
  return entry.renewing ? "renewing" : "ending";
}

/** Whether a member is current — either kind of active. */
export function isCurrentMember(entry: MemberOverview): boolean {
  const standing = memberStanding(entry);
  return standing === "renewing" || standing === "ending";
}

/**
 * Whether picking a membership back up has to be paid for now.
 *
 * A supporter who ended their arrangement and changes their mind is in one of
 * two situations, and they are not the same transaction. Still inside a period
 * they paid for, they owe nothing — only the continuation has to start again,
 * and charging them would be the second payment for one period that the
 * product gives straight back anyway (specs/concepts/membership.md). Lapsed,
 * they are joining as anyone would, and this period is theirs to pay for.
 *
 * `null` — nothing ever paid — counts as owing: an arrangement that was never
 * paid for has no period behind it.
 */
export function resumeCostsNow(latestPeriodYear: number | null, currentPeriodKey: number): boolean {
  if (latestPeriodYear === null) return true;
  return membershipStatus(latestPeriodYear, currentPeriodKey) !== "active";
}

/**
 * How many supporters stand where. Counted over the whole register, so the
 * numbers describe the organization and do not move while somebody searches.
 */
export function countMemberStandings(
  members: MemberOverview[],
): Record<MemberStanding, number> & { all: number; active: number } {
  const counts = { all: members.length, active: 0, renewing: 0, ending: 0, lapsed: 0, unpaid: 0 };
  for (const entry of members) {
    const standing = memberStanding(entry);
    counts[standing]++;
    if (standing === "renewing" || standing === "ending") counts.active++;
  }
  return counts;
}

/**
 * Whether a member matches what the administrator typed. Name, email and phone,
 * because those are the three ways anyone remembers a person.
 */
export function matchesMemberSearch(entry: MemberOverview, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [entry.member.name, entry.member.email, entry.member.phone].some((field) =>
    field?.toLowerCase().includes(needle),
  );
}

/** One member, with every period they have ever supported — newest first. */
export async function getOrganizationMember(
  db: Db,
  orgId: string,
  memberId: string,
  currentPeriodKey: number,
): Promise<(MemberOverview & { history: Membership[] }) | null> {
  const [member] = await db
    .select()
    .from(supportingMembers)
    .where(and(eq(supportingMembers.orgId, orgId), eq(supportingMembers.id, memberId)));
  if (!member) return null;

  const history = await listMembershipHistory(db, member.id);
  const latest = history[0] ?? null;
  const [live] = await db
    .select({ id: membershipAgreements.id })
    .from(membershipAgreements)
    .where(
      and(eq(membershipAgreements.memberId, member.id), eq(membershipAgreements.status, "ACTIVE")),
    );

  return {
    member,
    latest,
    status: latest ? membershipStatus(latest.periodYear, currentPeriodKey) : "lapsed",
    renewing: Boolean(live),
    hearts: history.length,
    recruits: await countRecruits(db, member.id),
    history,
  };
}

// ── Erasing a member (specs/concepts/member-data.md) ───────────────────────

/**
 * How many years a member's identity outlives their last supported period.
 *
 * The organization's payment documentation has to name its counterparty for
 * five years (bokføringsloven), so the person stays exactly as long as the
 * books that name them — and goes the year after. One rule, tied to a duty the
 * organization already has, which is also what the privacy notice can state
 * plainly (specs/concepts/member-data.md).
 */
export const MEMBER_IDENTITY_RETENTION_YEARS = 5;

/** Is this member's yearly arrangement still running? */
export async function hasRunningAgreement(db: Db, memberId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: membershipAgreements.id })
    .from(membershipAgreements)
    .where(
      and(eq(membershipAgreements.memberId, memberId), eq(membershipAgreements.status, "ACTIVE")),
    );
  return Boolean(row);
}

/**
 * Erase the person, keep the year. Name, contact details, the payment
 * provider's id for them and the tokens addressing their personal pages all
 * go; the periods they paid for and the payments behind them stay, so the
 * organization's totals for a year it has already reported do not move.
 *
 * Idempotent: a member erased twice is erased once. Refuses while an
 * arrangement is still running — a member cannot be erased out of a contract
 * that is still charging them (specs/use-cases/erase-member-data.md).
 */
export async function anonymizeMember(
  db: Db,
  memberId: string,
): Promise<{ member: SupportingMember; erased: boolean } | null> {
  const [existing] = await db
    .select()
    .from(supportingMembers)
    .where(eq(supportingMembers.id, memberId));
  if (!existing) return null;
  if (existing.anonymizedAt) return { member: existing, erased: false };
  if (await hasRunningAgreement(db, memberId)) return { member: existing, erased: false };

  // The agreement's copy of the provider id, and the token that opens the
  // member's own page, are the person too: leaving either behind would mean
  // the erased member still has a working personal address on the internet.
  await db
    .update(membershipAgreements)
    .set({ vippsSub: null, manageToken: null })
    .where(eq(membershipAgreements.memberId, memberId));

  const [updated] = await db
    .update(supportingMembers)
    .set({
      name: null,
      email: null,
      phone: null,
      // Clearing the sub means a returning supporter is met as a new member
      // rather than re-attached to the row they asked us to forget. Their
      // history starts over — that is what erasure costs, and it is theirs to
      // choose.
      vippsSub: null,
      // The card is a public address showing their name. It must stop
      // resolving, not merely stop being linked to.
      cardToken: null,
      anonymizedAt: new Date().toISOString(),
    })
    .where(eq(supportingMembers.id, memberId))
    .returning();
  return updated ? { member: updated, erased: true } : { member: existing, erased: false };
}

/**
 * The members of one organization whose identity has outlived the payment
 * history that justified keeping it — the retention rule, as a query.
 *
 * A member is due once `MEMBER_IDENTITY_RETENTION_YEARS` have passed since the
 * later of their last supported period and the year they were registered (a
 * supporter who never completed a payment has no period to count from, and no
 * bookkeeping reason to be kept at all). Anyone still renewing is never due:
 * they are a current member, not a record.
 */
export async function selectMembersDueForErasure(
  db: Db,
  orgId: string,
  currentPeriodKey: number,
): Promise<string[]> {
  const rows = await db
    .select({
      id: supportingMembers.id,
      createdAt: supportingMembers.createdAt,
      periodYear: memberships.periodYear,
    })
    .from(supportingMembers)
    .leftJoin(memberships, eq(memberships.memberId, supportingMembers.id))
    .where(and(eq(supportingMembers.orgId, orgId), isNull(supportingMembers.anonymizedAt)));

  // One row per membership, so fold them into the last year each member has.
  const lastYear = new Map<string, number>();
  for (const row of rows) {
    const year = Math.max(row.periodYear ?? 0, Number(row.createdAt.slice(0, 4)) || 0);
    lastYear.set(row.id, Math.max(lastYear.get(row.id) ?? 0, year));
  }

  const due: string[] = [];
  for (const [memberId, year] of lastYear) {
    if (year + MEMBER_IDENTITY_RETENTION_YEARS >= currentPeriodKey) continue;
    if (await hasRunningAgreement(db, memberId)) continue;
    due.push(memberId);
  }
  return due;
}

// ── The member's card (specs/concepts/member-card.md) ──────────────────────

/**
 * The address of this member's card, minted if they have none yet.
 *
 * Every member gets one when they are created, and the migration gave one to
 * everyone who already existed — but a row inserted by hand (a seed, a
 * repair) can still arrive without, and a member without a card address has no
 * card at all. So this mints rather than assumes, and is safe to call on every
 * view: an existing token is returned untouched, because a card's address must
 * never change under someone who has already shared it.
 */
export async function ensureMemberCardToken(db: Db, memberId: string): Promise<string | null> {
  const [member] = await db
    .select({ cardToken: supportingMembers.cardToken })
    .from(supportingMembers)
    .where(eq(supportingMembers.id, memberId));
  if (!member) return null;
  if (member.cardToken) return member.cardToken;

  const cardToken = crypto.randomUUID();
  await db
    .update(supportingMembers)
    .set({ cardToken })
    .where(and(eq(supportingMembers.id, memberId), isNull(supportingMembers.cardToken)));
  // Re-read rather than trust the write: two requests racing for the same
  // missing token must end up showing the same card address.
  const [settled] = await db
    .select({ cardToken: supportingMembers.cardToken })
    .from(supportingMembers)
    .where(eq(supportingMembers.id, memberId));
  return settled?.cardToken ?? cardToken;
}

/**
 * How many supporting members joined on this member's referral and went on to
 * actually pay (specs/concepts/scorecard.md — a scan scores nothing; only a
 * completed join counts).
 */
export async function countRecruits(db: Db, memberId: string): Promise<number> {
  const rows = await db
    .selectDistinct({ recruitId: supportingMembers.id })
    .from(supportingMembers)
    .innerJoin(memberships, eq(memberships.memberId, supportingMembers.id))
    .where(eq(supportingMembers.referredByMemberId, memberId));
  return rows.length;
}

/**
 * The member behind a card address, for crediting a referral — nothing more,
 * so it deliberately reads no history.
 *
 * Scoped to the organization being joined: a card from one organization can
 * never credit a recruit in another, because a scorecard is per organization
 * (specs/concepts/scorecard.md). An unknown or foreign token simply yields
 * nothing, and the join proceeds unattributed rather than failing.
 */
export async function findMemberIdByCardToken(
  db: Db,
  orgId: string,
  cardToken: string,
): Promise<string | null> {
  if (!cardToken) return null;
  const [row] = await db
    .select({ id: supportingMembers.id })
    .from(supportingMembers)
    .where(and(eq(supportingMembers.orgId, orgId), eq(supportingMembers.cardToken, cardToken)));
  return row?.id ?? null;
}

/** Everything a member's card shows, gathered from what is already true. */
export interface MemberCard {
  member: SupportingMember;
  organization: Organization;
  /** One per supported annual period — the hearts, newest period first. */
  history: Membership[];
  hearts: number;
  recruits: number;
  /** The most recent period paid for; null when none ever completed. */
  latest: Membership | null;
  status: "active" | "lapsed";
}

/**
 * The card behind a card address (specs/concepts/member-card.md). An address
 * that matches nothing yields nothing at all — never a hint of which
 * organization it might have belonged to.
 *
 * A member who has not completed a payment has no card: there is nothing to
 * prove yet.
 */
export async function findMemberCardByToken(
  db: Db,
  cardToken: string,
  currentPeriodKey: number,
): Promise<MemberCard | null> {
  const [row] = await db
    .select({ member: supportingMembers, organization: organizations })
    .from(supportingMembers)
    .innerJoin(organizations, eq(supportingMembers.orgId, organizations.id))
    .where(eq(supportingMembers.cardToken, cardToken));
  if (!row) return null;

  const history = await listMembershipHistory(db, row.member.id);
  if (history.length === 0) return null;
  const latest = history[0] ?? null;

  return {
    ...row,
    history,
    hearts: history.length,
    recruits: await countRecruits(db, row.member.id),
    latest,
    status: latest ? membershipStatus(latest.periodYear, currentPeriodKey) : "lapsed",
  };
}

/** What an administrator may correct about a member: how to reach them. */
export interface MemberContactDetails {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Fix a member's recorded identity — a misspelt name, an address that bounces.
 * It touches nothing about what they paid: status follows payment, and no
 * correction here can make someone a member or stop them being one.
 */
export async function updateMemberContactDetails(
  db: Db,
  orgId: string,
  memberId: string,
  details: MemberContactDetails,
): Promise<SupportingMember | null> {
  const [row] = await db
    .update(supportingMembers)
    .set(details)
    .where(and(eq(supportingMembers.orgId, orgId), eq(supportingMembers.id, memberId)))
    .returning();
  return row ?? null;
}

// ── Member notices ───────────────────────────────────────────────────────
// What the product has told a member about their own membership, and what
// that entitles it to charge them (specs/concepts/member-notice.md).

/**
 * How long a member must have known a new price before it can be charged
 * (specs/use-cases/change-the-annual-fee.md). Long enough to read an email and
 * act on it; short enough that an organization repricing in the autumn still
 * reaches the coming renewal.
 */
export const FEE_NOTICE_DAYS = 14;

const isoDaysAgo = (days: number, from: Date): string =>
  new Date(from.getTime() - days * 86_400_000).toISOString();

/**
 * One member's position on price: what they are signed up for, what they
 * believe they pay, and what they may be charged today.
 */
export interface MemberFeeStanding {
  agreement: MembershipAgreement;
  member: SupportingMember;
  tier: MembershipTier;
  /**
   * The fee the member currently expects — the last one they were told, or
   * failing that the last one they actually paid. Differs from the tier's fee
   * exactly when they are owed a notice.
   */
  knownFeeNok: number;
  /**
   * The fee they may be charged now: the last one they have known long enough
   * (see FEE_NOTICE_DAYS). A change announced yesterday is not in here.
   */
  ripeFeeNok: number;
  /** When they were last told about a price, if ever. */
  lastNoticeAt: string | null;
}

/**
 * Every live arrangement in the organization, with what its member knows about
 * the price. Agreements with nobody attached are left out: a draft nobody
 * consented to has no one to tell and no one to charge.
 */
export async function listMemberFeeStandings(
  db: Db,
  orgId: string,
  today: Date = new Date(),
  // The accelerated staging calendar scales the rule with everything else
  // (PeriodScheme.feeNoticeDays); real days, may be fractional.
  noticeDays: number = FEE_NOTICE_DAYS,
): Promise<MemberFeeStanding[]> {
  const rows = await db
    .select({ agreement: membershipAgreements, tier: membershipTiers, member: supportingMembers })
    .from(membershipAgreements)
    .innerJoin(membershipTiers, eq(membershipAgreements.tierId, membershipTiers.id))
    .innerJoin(supportingMembers, eq(membershipAgreements.memberId, supportingMembers.id))
    .where(and(eq(membershipAgreements.orgId, orgId), eq(membershipAgreements.status, "ACTIVE")));
  if (rows.length === 0) return [];

  // Both kinds of "this member knows the price": what we told them, and what
  // they chose for themselves (specs/use-cases/change-membership-tier.md).
  const notices = await db
    .select()
    .from(memberNotices)
    .where(
      and(
        eq(memberNotices.orgId, orgId),
        inArray(memberNotices.kind, ["fee-change", "tier-choice"]),
      ),
    )
    .orderBy(desc(memberNotices.sentAt));

  // What they last actually paid — the fee they know when they have never been
  // sent a notice, because paying it is how they learned it.
  const paid = await db
    .select({
      memberId: memberships.memberId,
      periodYear: memberships.periodYear,
      annualFeeNok: memberships.annualFeeNok,
    })
    .from(memberships)
    .where(eq(memberships.orgId, orgId))
    .orderBy(desc(memberships.periodYear));

  const lastPaidFee = new Map<string, number>();
  for (const row of paid)
    if (!lastPaidFee.has(row.memberId)) lastPaidFee.set(row.memberId, row.annualFeeNok);

  const cutoff = isoDaysAgo(noticeDays, today);
  const key = (memberId: string, tierId: string) => `${memberId}:${tierId}`;
  const newest = new Map<string, MemberNotice>();
  const newestRipe = new Map<string, MemberNotice>();
  for (const notice of notices) {
    if (!notice.tierId) continue;
    const k = key(notice.memberId, notice.tierId);
    if (!newest.has(k)) newest.set(k, notice);
    if (!newestRipe.has(k) && feeMayBeChargedNow(notice, cutoff)) newestRipe.set(k, notice);
  }

  return rows.map(({ agreement, tier, member }) => {
    const k = key(member.id, tier.id);
    // Order matters: what we told them beats what they paid, and both beat the
    // agreement's own amount — which repricing overwrites, so it is only a
    // last resort for a member who has somehow paid nothing yet.
    const fallback = lastPaidFee.get(member.id) ?? agreement.annualFeeNok;
    return {
      agreement,
      member,
      tier,
      knownFeeNok: newest.get(k)?.feeNok ?? fallback,
      ripeFeeNok: newestRipe.get(k)?.feeNok ?? fallback,
      lastNoticeAt: newest.get(k)?.sentAt ?? null,
    };
  });
}

/**
 * Whether a recorded fee is one the member may be charged from now on.
 *
 * The waiting period is protection from the ORGANIZATION's changes: it buys a
 * member time to notice a price they did not ask for and get out of it before
 * it is taken (specs/use-cases/change-the-annual-fee.md). A price the member
 * picked themselves needs no such time — they are the one who picked it, and
 * making them wait for their own decision would only charge them the old
 * amount for another year (specs/use-cases/change-membership-tier.md).
 */
export function feeMayBeChargedNow(
  notice: { kind: MemberNoticeKind; sentAt: string },
  cutoff: string,
): boolean {
  return notice.kind === "tier-choice" || notice.sentAt <= cutoff;
}

/** Whether this member has yet to hear about the price they are now on. */
export function owesFeeChangeNotice(standing: MemberFeeStanding): boolean {
  return standing.tier.annualFeeNok !== standing.knownFeeNok;
}

/**
 * What this member's next renewal may cost.
 *
 * Never more than they have known about for long enough — that is the whole
 * point of the notice. Never more than the tier costs either: a price cut
 * reaches them at once, because being charged less than announced is not the
 * kind of surprise the rule guards against.
 */
export function renewalFeeNok(standing: MemberFeeStanding): number {
  return Math.min(standing.tier.annualFeeNok, standing.ripeFeeNok);
}

export interface MemberNoticeRecord {
  orgId: string;
  memberId: string;
  agreementId: string;
  kind: MemberNoticeKind;
  tierId: string;
  /** For a fee change, the fee announced; for a receipt, the amount paid. */
  feeNok: number;
  /** Fee changes only: the fee the member knew before this one. */
  previousFeeNok?: number;
  /** Receipts only: the captured payment this notice documents. */
  chargeId?: string;
}

/** Write down that a member was told — only ever after the message went out. */
export async function recordMemberNotice(db: Db, notice: MemberNoticeRecord): Promise<void> {
  await db.insert(memberNotices).values({ id: crypto.randomUUID(), ...notice });
}

/** Everything an organization has told one member, newest first. */
export async function listMemberNotices(db: Db, memberId: string): Promise<MemberNotice[]> {
  return db
    .select()
    .from(memberNotices)
    .where(eq(memberNotices.memberId, memberId))
    .orderBy(desc(memberNotices.sentAt));
}

/** One captured payment that still owes its member a receipt. */
export interface CaptureOwedReceipt {
  charge: MembershipCharge;
  /** The period the payment bought — the receipt's "what was delivered". */
  membership: Membership;
  member: SupportingMember;
  agreement: MembershipAgreement;
}

/**
 * Which captured payments have no receipt yet (specs/concepts/payment-receipt.md).
 *
 * By comparison, not by memory: a capture owes a receipt for as long as no
 * `receipt` notice points at the charge, so the send that failed tonight is
 * simply still owed tomorrow. Only captures that bought a membership qualify —
 * a capture without one is the activation race, and its receipt follows once
 * the membership does. `since` bounds the sweep: a capture older than the
 * window is no longer chased (deploying this feature must not shower members
 * with receipts for long-settled payments).
 */
export async function listCapturesOwedReceipt(
  db: Db,
  orgId: string,
  since: Date,
): Promise<CaptureOwedReceipt[]> {
  return db
    .select({
      charge: membershipCharges,
      membership: memberships,
      member: supportingMembers,
      agreement: membershipAgreements,
    })
    .from(membershipCharges)
    .innerJoin(memberships, eq(membershipCharges.membershipId, memberships.id))
    .innerJoin(supportingMembers, eq(memberships.memberId, supportingMembers.id))
    .innerJoin(membershipAgreements, eq(membershipCharges.agreementId, membershipAgreements.id))
    .leftJoin(memberNotices, eq(memberNotices.chargeId, membershipCharges.id))
    .where(
      and(
        eq(membershipCharges.orgId, orgId),
        eq(membershipCharges.status, "CHARGED"),
        isNull(memberNotices.id),
        gte(
          sql`coalesce(${membershipCharges.capturedAt}, ${membershipCharges.updatedAt})`,
          since.toISOString(),
        ),
      ),
    )
    .orderBy(asc(membershipCharges.capturedAt));
}

/** The receipt notice documenting one charge, when one has gone out. */
export async function findReceiptNotice(db: Db, chargeId: string): Promise<MemberNotice | null> {
  const [row] = await db
    .select()
    .from(memberNotices)
    .where(and(eq(memberNotices.chargeId, chargeId), eq(memberNotices.kind, "receipt")));
  return row ?? null;
}

/**
 * Which of the organization's arrangements already have a payment booked for a
 * period. A fee change cannot reach a renewal that is already arranged, so
 * this is how a notice knows which year to name.
 */
export async function agreementsChargedForPeriod(
  db: Db,
  orgId: string,
  periodYear: number,
): Promise<Set<string>> {
  const rows = await db
    .select({ agreementId: membershipCharges.agreementId })
    .from(membershipCharges)
    .where(and(eq(membershipCharges.orgId, orgId), eq(membershipCharges.periodYear, periodYear)));
  return new Set(rows.map((row) => row.agreementId));
}

/** One supporting member by id — the row behind a manage token. */
export async function getSupportingMember(
  db: Db,
  memberId: string,
): Promise<SupportingMember | null> {
  const [row] = await db.select().from(supportingMembers).where(eq(supportingMembers.id, memberId));
  return row ?? null;
}
