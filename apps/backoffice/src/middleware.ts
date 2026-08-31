import { defineMiddleware } from "astro:middleware";
import { JOIN_PAGE_PATH_SEGMENT, MEMBER_CARD_PATH_SEGMENT } from "@stottemedlem/core";
import { env, getWorkOS, SESSION_COOKIE, sessionCookieOptions, toSessionInfo } from "./lib/workos";

// Paths reachable without a session. Everything else requires an authenticated
// WorkOS session; unauthenticated requests are sent to /login.
// /favicon.ico is here because browsers and crawlers request it unprompted on
// the public pages — without it they get bounced into the login flow.
const PUBLIC_EXACT = new Set(["/login", "/callback", "/logout", "/healthz", "/favicon.ico"]);
function isPublic(pathname: string): boolean {
  // /api/qr/* is the public QR embed contract (see docs/qr-codes.md).
  // /bli-medlem/* is the org's public join page + salgsvilkår
  // (specs/concepts/join-page.md) — Vipps' website verification and
  // prospective supporters reach them without any session. /org/* is the
  // page's former address, kept alive as a redirect (see worker.ts).
  return (
    PUBLIC_EXACT.has(pathname) ||
    pathname.startsWith("/api/qr/") ||
    // Vipps' payment-event deliveries carry no session; they authenticate
    // themselves with an HMAC signature the receiver verifies.
    pathname.startsWith("/api/vipps/") ||
    pathname.startsWith(`/${JOIN_PAGE_PATH_SEGMENT}/`) ||
    // A member's card is theirs to share with anyone, so it can carry no
    // session at all (specs/concepts/member-card.md).
    pathname.startsWith(`/${MEMBER_CARD_PATH_SEGMENT}/`) ||
    pathname.startsWith("/org/")
  );
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
