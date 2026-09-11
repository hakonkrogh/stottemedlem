import type { APIRoute } from "astro";
import { logger } from "../../lib/log";

/**
 * Where a card that arrived without its words tells the operator
 * (specs/concepts/operational-alerting.md).
 *
 * Every other alert in this product is the product noticing its own work go
 * wrong, at night, with nobody watching. This one is different: only the
 * reader's browser can see what was actually painted on the picture it was
 * handed, so the browser is the only witness there is
 * (specs/concepts/member-card.md). `MemberCardFigure.astro` looks at the card
 * it drew and calls here when the member's name strip came out blank.
 *
 * Two rules the alerting spec puts on this:
 *
 *  - **Identifiers and counts, never member personal data.** The report says
 *    which surface and which VERSION of a card (a hash already public in the
 *    picture's own address), never the card token, the member, or the page
 *    address the token lives in.
 *  - **Alerting must never become the outage.** Nothing here can fail a page:
 *    the answer is always 204, whatever arrived.
 *
 * This is an unauthenticated address, so the body is checked into a known
 * shape rather than logged as it came. The message is a constant, which is
 * what makes a flood ONE Sentry issue with a count rather than a mailbox full
 * (one problem, one conversation). Anyone may still push that count up; what
 * they cannot do is invent a new alert or put anything of their own in front
 * of the operator.
 */

const log = logger("cards");

/** What the surfaces are allowed to call themselves. */
const SURFACES = new Set(["kvittering", "min-side", "medlemsbevis"]);

/** A card version is a short FNV digest in base 36 (src/lib/memberCard.ts). */
const VERSION = /^[a-z0-9]{1,10}$/;

export const POST: APIRoute = async ({ request }) => {
  const no = () => new Response(null, { status: 204 });
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null) return no();
    const { surface, version, width } = body as Record<string, unknown>;
    if (typeof surface !== "string" || !SURFACES.has(surface)) return no();
    if (typeof version !== "string" || !VERSION.test(version)) return no();

    log.error("a member card was drawn without its words", undefined, {
      surface,
      version,
      // How wide the picture was being shown, which is the one thing about the
      // reader worth knowing: it says whether this is a phone.
      width: typeof width === "number" && Number.isFinite(width) ? Math.round(width) : null,
      userAgent: request.headers.get("user-agent") ?? null,
    });
  } catch {
    // A malformed body is not worth an alert of its own.
  }
  return no();
};
