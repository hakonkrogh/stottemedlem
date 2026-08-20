/**
 * @stottemedlem/db — D1 schema (Drizzle) + query helpers.
 *
 * Consumed by apps/backoffice only. `createDb` wraps the Worker's D1 binding;
 * the repository functions below are the only place SQL for the organizations
 * table lives.
 */
import type { D1Database } from "@cloudflare/workers-types";
import { membershipTierKey, slugifyOrganizationName } from "@stottemedlem/core";
import { and, asc, eq, isNull, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  type MembershipTier,
  membershipTiers,
  type Organization,
  organizations,
} from "./schema.js";

export {
  type MembershipTier,
  membershipTiers,
  type NewMembershipTier,
  type NewOrganization,
  type Organization,
  organizations,
} from "./schema.js";

export type Db = ReturnType<typeof createDb>;

/** Wrap the Worker's D1 binding in a typed Drizzle client. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { organizations, membershipTiers } });
}

/** The profile fields the Vipps order form requires the landing page to show. */
export interface OrganizationProfile {
  orgnr: string | null;
  contactEmail: string | null;
}

/**
 * Whether the organization has everything its public landing page must show to
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
 * the Vipps-registered landing page URL depend on it).
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
 * The organization's uploaded visual identity (specs/concepts/org-landing-page.md):
 * R2 object keys for the logo and banner. Unlike the profile fields these are
 * optional — the landing page omits what is absent.
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
