/**
 * @stottemedlem/db — D1 schema (Drizzle) + query helpers.
 *
 * Consumed by apps/backoffice only. `createDb` wraps the Worker's D1 binding;
 * the repository functions below are the only place SQL for the organizations
 * table lives.
 */
import type { D1Database } from "@cloudflare/workers-types";
import { slugifyOrganizationName } from "@stottemedlem/core";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { type Organization, organizations } from "./schema.js";

export { type NewOrganization, type Organization, organizations } from "./schema.js";

export type Db = ReturnType<typeof createDb>;

/** Wrap the Worker's D1 binding in a typed Drizzle client. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { organizations } });
}

/** The profile fields the Vipps order form requires the landing page to show. */
export interface OrganizationProfile {
  orgnr: string | null;
  contactEmail: string | null;
  annualFeeNok: number | null;
}

/**
 * Whether the organization has everything its public landing page must show to
 * pass Vipps' website verification: org.nr, contact info, and the membership
 * price. Incomplete orgs get a fill-in prompt in the back office.
 */
export function isProfileComplete(org: Organization): boolean {
  return org.orgnr !== null && org.contactEmail !== null && org.annualFeeNok !== null;
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
      annualFeeNok: profile?.annualFeeNok ?? null,
    })
    .returning();
  if (!row) throw new Error("insert into organizations returned no row");
  return row;
}

/** Update the public profile (and optionally the mirrored name). Slug never changes. */
export async function updateOrganizationProfile(
  db: Db,
  workosOrgId: string,
  profile: Partial<OrganizationProfile> & { name?: string },
): Promise<Organization | null> {
  const [row] = await db
    .update(organizations)
    .set(profile)
    .where(eq(organizations.workosOrgId, workosOrgId))
    .returning();
  return row ?? null;
}
