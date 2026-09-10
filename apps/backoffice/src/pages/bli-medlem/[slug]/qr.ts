import { getOrganizationBySlug } from "@stottemedlem/db";
import { qrCardSvg, qrSvg } from "@stottemedlem/qr";
import { qrPngBuffer } from "@stottemedlem/qr/node";
import type { APIRoute } from "astro";
import { withEmbeddedCardFont } from "../../../lib/cardFont";
import { getDb } from "../../../lib/db";
import { shareableJoinUrl } from "../../../lib/joinLinks";

/**
 * An organization's QR code card (and plain QR code) as an image.
 *
 * This is the stable address external websites hot-link to embed the card, the
 * picture the back office shows the administrator, and the download source
 * behind it:
 *
 *   GET /bli-medlem/[slug]/qr                        → card as SVG (default)
 *   GET /bli-medlem/[slug]/qr?variant=qr&format=png  → plain QR code as PNG
 *   GET /bli-medlem/[slug]/qr?variant=qr&format=svg  → plain QR code as SVG
 *   ?download=1  serve as attachment
 *
 * It lives beneath the join page rather than under an API path because it is
 * one of the organization's public addresses: an administrator reads it, pastes
 * it into their own website, and it travels on printed material. Its former
 * address, /api/qr/[slug], still answers with a permanent redirect and must
 * keep doing so (specs/concepts/join-page.md).
 *
 * The name on the card is the organization's own, read from its row: it is
 * printed and hung on a wall, so it may not be a guess made from the slug, and
 * it may not be something a stranger can put there through the URL. An address
 * that names no organization we hold gets no card at all, the way its join
 * page gets no page: a card whose code leads to a 404 is worse than no card.
 *
 * The card is served with its typeface riding inside it. It is looked at as a
 * picture everywhere it matters (an `<img>` in the back office, an `<img>` on
 * a club's own website, a file dropped into a poster), and an SVG loaded that
 * way fetches no webfont, so without the embedded face the card would set in
 * Georgia on every surface but the marketing page that inlines it.
 *
 * The QR code encodes this environment's shareable join-page address (the
 * canonical støttemedlem.no origin in production, staging's own on staging —
 * see lib/joinLinks.ts), never the request's origin — printed codes must
 * survive any move of this Worker.
 */

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62})$/;

const CACHE_HEADER = "public, max-age=3600, s-maxage=86400";

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug ?? "";
  if (!SLUG_PATTERN.test(slug)) {
    return new Response("Ugyldig organisasjonsnavn i adressen.", { status: 400 });
  }

  const organization = await getOrganizationBySlug(getDb(), slug);
  if (!organization) {
    return new Response("Fant ikke organisasjonen", { status: 404 });
  }

  const variant = url.searchParams.get("variant") ?? "card";
  const format = url.searchParams.get("format") ?? (variant === "qr" ? "png" : "svg");
  const download = url.searchParams.get("download") === "1";
  const joinUrl = shareableJoinUrl(slug);

  const headers = new Headers({ "Cache-Control": CACHE_HEADER });
  const attach = (filename: string) => {
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }
  };

  if (variant === "card") {
    if (format !== "svg") {
      return new Response("Kortet serveres som SVG; be om variant=qr for PNG.", { status: 400 });
    }
    headers.set("Content-Type", "image/svg+xml; charset=utf-8");
    attach(`stottemedlem-kort-${slug}.svg`);
    const card = qrCardSvg({ joinUrl, organizationName: organization.name });
    return new Response(withEmbeddedCardFont(card), { headers });
  }

  if (variant === "qr") {
    if (format === "png") {
      const png = await qrPngBuffer(joinUrl);
      headers.set("Content-Type", "image/png");
      attach(`stottemedlem-qr-${slug}.png`);
      return new Response(new Uint8Array(png), { headers });
    }
    if (format === "svg") {
      headers.set("Content-Type", "image/svg+xml; charset=utf-8");
      attach(`stottemedlem-qr-${slug}.svg`);
      return new Response(await qrSvg(joinUrl), { headers });
    }
    return new Response("Ukjent format. Bruk format=png eller format=svg.", { status: 400 });
  }

  return new Response("Ukjent variant. Bruk variant=card eller variant=qr.", { status: 400 });
};
