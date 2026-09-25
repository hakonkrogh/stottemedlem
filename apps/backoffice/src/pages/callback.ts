import type { APIRoute } from "astro";
import { getDb } from "../lib/db";
import {
  env,
  finishSignIn,
  getWorkOS,
  resolveLanding,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../lib/workos";

// AuthKit redirects back here with `?code=...`. Exchange it for a sealed
// session, set the cookie, then route by how many organizations the user is in
// (create one / straight in / pick one — see resolveLanding).
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  if (!code) return redirect("/login");
  // A code this browser did not ask for is never exchanged: that is how an
  // attacker would sign a victim into the attacker's own account. The person
  // simply starts over from /login, which is also where an accepted
  // invitation (it arrives from AuthKit without our state) goes: AuthKit
  // still knows them, so the second pass comes straight back.
  if (!finishSignIn(url, cookies)) return redirect("/login");

  const workos = getWorkOS();
  let auth: Awaited<ReturnType<typeof workos.userManagement.authenticateWithCode>>;
  try {
    auth = await workos.userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
      session: { sealSession: true, cookiePassword: env.WORKOS_COOKIE_PASSWORD },
    });
  } catch (error) {
    console.error("WorkOS authenticateWithCode failed", error);
    return redirect("/login?error=auth");
  }

  if (auth.sealedSession) {
    cookies.set(SESSION_COOKIE, auth.sealedSession, sessionCookieOptions(url));
  }

  const landing = await resolveLanding(workos, getDb(), auth.user.id);

  // Single-org users go straight in — scope the session to that org first so the
  // session's active organizationId matches the dashboard they land on.
  if (landing.organizationId && auth.sealedSession) {
    const session = workos.userManagement.loadSealedSession({
      sessionData: auth.sealedSession,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });
    const refreshed = await session.refresh({
      organizationId: landing.organizationId,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });
    if (refreshed.authenticated && refreshed.sealedSession) {
      cookies.set(SESSION_COOKIE, refreshed.sealedSession, sessionCookieOptions(url));
    }
  }

  return redirect(landing.path);
};
