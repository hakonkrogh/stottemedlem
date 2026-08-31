import { DPA_VERSION } from "@stottemedlem/core";
import {
  countActiveMembers,
  hasAcceptedDpa,
  listMembershipTiers,
  type MembershipTier,
  type Organization,
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
  /** Supporters current for this period — the count the member tab carries. */
  activeMembers: number;
  /** Where this deployment receives this org's payment events. */
  webhookUrl: string;
}

/** Load the chrome-level view of an org the caller has already vetted. */
export async function orgView(org: Organization, request: Request): Promise<OrgView> {
  const webhookUrl = webhookReceiverUrl(publicOrigin(request), org.slug);
  const [tiers, vippsKeys, activeMembers] = await Promise.all([
    listMembershipTiers(getDb(), org.id),
    readOrgVippsKeys(getWorkOS(), org.workosOrgId),
    countActiveMembers(getDb(), org.id, periods.periodFor().year),
  ]);
  return {
    org,
    tiers,
    vippsKeys,
    activeMembers,
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
