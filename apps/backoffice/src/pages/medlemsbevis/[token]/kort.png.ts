import { memberCardSize } from "@stottemedlem/qr";
import type { APIRoute } from "astro";
import { renderCardPng } from "../../../lib/cardImage";
import { getDb } from "../../../lib/db";
import { loadMemberCard, renderMemberCardSvg } from "../../../lib/memberCard";

/**
 * The member's card as a picture (specs/concepts/member-card.md).
 *
 * This is the form the outside world understands: what a social feed previews
 * when the card address is shared, what travels with a receipt, and what a
 * member can save. `?bredde=` renders it larger for printing.
 */

/** Big enough to print, small enough that nobody rasterizes a poster by accident. */
const MAX_WIDTH = 2400;

export const GET: APIRoute = async ({ params, url }) => {
  const card = await loadMemberCard(getDb(), params.token ?? "");
  if (!card) return new Response("Fant ikke medlemsbeviset", { status: 404 });

  // Only an explicitly asked-for width overrides the default. `Number(null)` is
  // 0, so testing the parsed value alone would silently render every card at
  // the minimum instead of at its natural size.
  const asked = url.searchParams.get("bredde");
  const parsed = asked === null ? Number.NaN : Number(asked);
  const width = Number.isFinite(parsed)
    ? Math.min(MAX_WIDTH, Math.max(600, Math.round(parsed)))
    : memberCardSize().width;

  const png = await renderCardPng(await renderMemberCardSvg(card), width);
  const headers = new Headers({
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=300",
  });
  if (url.searchParams.get("last") === "1") {
    headers.set("Content-Disposition", 'attachment; filename="medlemsbevis.png"');
  }
  return new Response(png, { headers });
};
