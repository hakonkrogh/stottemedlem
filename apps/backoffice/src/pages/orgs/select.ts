import { ensureOrganization } from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { env, getWorkOS, orgPath, SESSION_COOKIE, sessionCookieOptions } from "../../lib/workos";

// The org selector posts an organizationId here. Verify the user really is a
// member, scope the session into that org (refresh mints an org-scoped token),
// then land on its dashboard.
export const POST: APIRoute = async ({ request, url, locals, cookies, redirect }) => {
  const session = locals.session;
  if (!session) return redirect("/login");

  const form = await request.formData();
  const organizationId = String(form.get("organizationId") ?? "");
  if (!organizationId) return redirect("/orgs");

  const workos = getWorkOS();
  const { data: memberships } = await workos.userManagement.listOrganizationMemberships({
    userId: session.userId,
    statuses: ["active"],
    limit: 100,
  });
  const membership = memberships.find((m) => m.organizationId === organizationId);
  if (!membership) return redirect("/orgs");

  const sealed = cookies.get(SESSION_COOKIE)?.value;
  if (!sealed) return redirect("/login");

  const cookieSession = workos.userManagement.loadSealedSession({
    sessionData: sealed,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
  const refreshed = await cookieSession.refresh({
    organizationId,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
  if (refreshed.authenticated && refreshed.sealedSession) {
    cookies.set(SESSION_COOKIE, refreshed.sealedSession, sessionCookieOptions(url));
  }

  const org = await ensureOrganization(getDb(), organizationId, membership.organizationName);
  return redirect(orgPath(org.slug));
};
