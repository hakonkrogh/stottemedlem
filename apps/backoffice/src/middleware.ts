import { defineMiddleware } from "astro:middleware";
import { env, getWorkOS, SESSION_COOKIE, sessionCookieOptions, toSessionInfo } from "./lib/workos";

// Paths reachable without a session. Everything else requires an authenticated
// WorkOS session; unauthenticated requests are sent to /login.
const PUBLIC_EXACT = new Set(["/login", "/callback", "/logout", "/healthz"]);
function isPublic(pathname: string): boolean {
  // /api/qr/* is the public QR embed contract (see docs/qr-codes.md).
  return PUBLIC_EXACT.has(pathname) || pathname.startsWith("/api/qr/");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals } = context;

  const sealed = cookies.get(SESSION_COOKIE)?.value;
  if (sealed) {
    const workos = getWorkOS();
    const session = workos.userManagement.loadSealedSession({
      sessionData: sealed,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    const auth = await session.authenticate();
    if (auth.authenticated) {
      locals.session = toSessionInfo(auth);
    } else {
      // Access token expired or otherwise unusable — try a refresh (rotates the
      // sealed cookie) before treating the visitor as signed out.
      const refreshed = await session.refresh({ cookiePassword: env.WORKOS_COOKIE_PASSWORD });
      if (refreshed.authenticated) {
        if (refreshed.sealedSession) {
          cookies.set(SESSION_COOKIE, refreshed.sealedSession, sessionCookieOptions(url));
        }
        locals.session = toSessionInfo(refreshed);
      } else {
        cookies.delete(SESSION_COOKIE, { path: "/" });
      }
    }
  }

  if (!locals.session && !isPublic(url.pathname)) {
    return context.redirect("/login");
  }

  return next();
});
