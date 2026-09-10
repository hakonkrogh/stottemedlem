import { joinPageQrPath } from "@stottemedlem/core";
import type { APIRoute } from "astro";

/**
 * The QR code card's former address.
 *
 * The card now lives beside the page it points at, at
 * `/bli-medlem/<slug>/qr` (specs/use-cases/promote-with-qr-card.md). This
 * address was what the back office handed out before that, and an organization
 * may have pasted it into its own website, so it keeps answering: an address
 * the product once gave out must never simply stop working
 * (specs/concepts/join-page.md).
 *
 * The query string travels along, because it is what selects the plain code,
 * the format and the download.
 */
export const GET: APIRoute = ({ params, url }) => {
  const slug = params.slug ?? "";
  const moved = new URL(url);
  moved.pathname = joinPageQrPath(slug);
  return new Response(null, {
    status: 301,
    headers: {
      Location: moved.toString(),
      // An embed follows this on every page view somebody's website serves.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
