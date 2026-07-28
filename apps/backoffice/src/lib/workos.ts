import { env } from "cloudflare:workers";
import { slugifyOrganizationName } from "@stottemedlem/core";
import { WorkOS } from "@workos-inc/node";

/** Name of the httpOnly cookie holding the WorkOS sealed session. */
export const SESSION_COOKIE = "wos-session";

/** The authenticated-user facts middleware exposes to pages via `Astro.locals.session`. */
export interface SessionInfo {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Active organization the session is scoped to (set once an org is chosen). */
  organizationId?: string;
  role?: string;
  sessionId: string;
}

/** A WorkOS session-cookie authentication/refresh success (shared by both calls). */
interface SessionSuccess {
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  sessionId: string;
  organizationId?: string;
  role?: string;
}

/** The runtime env app code reads (see env.d.ts). Re-exported for convenience. */
export { env };

/** Build a WorkOS client from runtime env. The SDK auto-selects its workerd build. */
export function getWorkOS(): WorkOS {
  return new WorkOS(env.WORKOS_API_KEY, { clientId: env.WORKOS_CLIENT_ID });
}

/** Cookie attributes for the sealed session. `secure` off only on plain-http localhost. */
export function sessionCookieOptions(url: URL) {
  return {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    // Long-lived; the refresh flow keeps the sealed contents fresh on each request.
    maxAge: 60 * 60 * 24 * 400,
  };
}

/** URL-safe slug for an organization, derived from its WorkOS display name. */
export function orgSlug(organizationName: string): string {
  return slugifyOrganizationName(organizationName);
}

/** Path of an organization's back-office dashboard. */
export function orgPath(organizationName: string): string {
  return `/o/${orgSlug(organizationName)}`;
}

/** Narrow a WorkOS session success response into our `SessionInfo`. */
export function toSessionInfo(r: SessionSuccess): SessionInfo {
  return {
    userId: r.user.id,
    email: r.user.email,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    organizationId: r.organizationId,
    role: r.role,
    sessionId: r.sessionId,
  };
}

/**
 * Where a freshly-authenticated user should land, per the product rule:
 * no organizations → create one; exactly one → straight into it; many → pick one.
 * `organizationId` is returned only for the single-org case, so the caller can
 * scope the session into that org before redirecting.
 */
export async function resolveLanding(
  workos: WorkOS,
  userId: string,
): Promise<{ path: string; organizationId?: string }> {
  const { data: memberships } = await workos.userManagement.listOrganizationMemberships({
    userId,
    statuses: ["active"],
    limit: 100,
  });
  const [only] = memberships;
  if (!only) return { path: "/orgs/new" };
  if (memberships.length === 1) {
    return { path: orgPath(only.organizationName), organizationId: only.organizationId };
  }
  return { path: "/orgs" };
}
