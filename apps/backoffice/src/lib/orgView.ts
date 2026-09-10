import { DPA_VERSION } from "@stottemedlem/core";
import {
  hasAcceptedDpa,
  listMembershipTiers,
  type MembershipTier,
  type Organization,
  type OrganizationStats,
  organizationStats,
  type StatsPeriodBounds,
} from "@stottemedlem/db";
import { getDb } from "./db";
import { publicOrigin } from "./membership";
import { requireOrgAccess } from "./orgAccess";
import { type OrgWarning, orgWarnings } from "./orgWarnings";
import { periods } from "./periods";
import { type OrgVippsKeys, readOrgVippsKeys, webhookReceiverUrl } from "./vippsKeys";
import { getWorkOS, orgPath, type SessionInfo } from "./workos";

/**
 * Everything every back-office screen of an organization needs before it can
 * render its own content: the org itself, its membership offer, its Vipps
 * keys, and what is not yet in order. The warning badges sit in the chrome, so
 * they have to be true on every tab — not only the one that computed them.
 */
export interface OrgView {
  org: Organization;
  tiers: MembershipTier[];
  vippsKeys: OrgVippsKeys | null;
  warnings: OrgWarning[];
  /**
   * The organization in numbers (specs/concepts/organization-figures.md). The
   * member tab carries the active count on every screen, which is why every
   * screen loads these.
   */
  stats: OrganizationStats;
  /** Where this deployment receives this org's payment events. */
  webhookUrl: string;
}

/**
 * The period running now, first day to last: the figures count what was ended
 * inside it, which is days rather than a period key
 * (specs/concepts/organization-figures.md).
 */
function currentPeriodBounds(): StatsPeriodBounds {
  const key = periods.periodFor().year;
  const { start, end } = periods.fullPeriod(key);
  return { key, start, end };
}

/** Load the chrome-level view of an org the caller has already vetted. */
export async function orgView(org: Organization, request: Request): Promise<OrgView> {
  const webhookUrl = webhookReceiverUrl(publicOrigin(request), org.slug);
  const [tiers, vippsKeys, stats] = await Promise.all([
    listMembershipTiers(getDb(), org.id),
    readOrgVippsKeys(getWorkOS(), org.workosOrgId),
    organizationStats(getDb(), org.id, currentPeriodBounds()),
  ]);
  return {
    org,
    tiers,
    vippsKeys,
    stats,
    webhookUrl,
    warnings: orgWarnings({
      orgPath: orgPath(org.slug),
      orgnr: org.orgnr,
      contactEmail: org.contactEmail,
      tierCount: tiers.length,
      vippsKeys,
      webhookUrl,
      dpaAccepted: hasAcceptedDpa(org, DPA_VERSION),
    }),
  };
}

/** The same, for a URL naming an org: null means "send them to /orgs". */
export async function requireOrgView(
  session: SessionInfo | undefined,
  slug: string | undefined,
  request: Request,
): Promise<OrgView | null> {
  const org = await requireOrgAccess(session, slug);
  return org ? orgView(org, request) : null;
}
