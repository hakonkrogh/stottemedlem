import type { APIRoute } from "astro";
import { env, getWorkOS, SESSION_COOKIE } from "../lib/workos";

// Clear the local cookie and hand off to WorkOS's logout URL, which ends the
// session on their side and returns to the app's configured logout redirect.
export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sealed = cookies.get(SESSION_COOKIE)?.value;
  cookies.delete(SESSION_COOKIE, { path: "/" });
  if (!sealed) return redirect("/login");

  const workos = getWorkOS();
  const session = workos.userManagement.loadSealedSession({
    sessionData: sealed,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
  });
  try {
    return redirect(await session.getLogoutUrl());
  } catch {
    // Session already invalid/expired — nothing to end remotely.
    return redirect("/login");
  }
};
