import { getOrganizationBySlug, type Organization } from "@stottemedlem/db";
import { getDb } from "./db";
import { getWorkOS, type SessionInfo } from "./workos";

/**
 * The organization a back-office URL names, if the signed-in person is allowed
 * to see it. Null means "send them to /orgs" — an org that does not exist and
 * one they are not a member of are deliberately indistinguishable, so the back
 * office never confirms that some other organization exists.
 *
 * WorkOS is the authority on who may act for an organization
 * (specs/concepts/administrator.md); our own row is the authority on
 * everything else about it.
 */
export async function requireOrgAccess(
  session: SessionInfo | undefined,
  slug: string | undefined,
): Promise<Organization | null> {
  if (!session || !slug) return null;
  const org = await getOrganizationBySlug(getDb(), slug);
  if (!org) return null;

  const { data: memberships } = await getWorkOS().userManagement.listOrganizationMemberships({
    userId: session.userId,
    statuses: ["active"],
    limit: 100,
  });
  return memberships.some((m) => m.organizationId === org.workosOrgId) ? org : null;
}
