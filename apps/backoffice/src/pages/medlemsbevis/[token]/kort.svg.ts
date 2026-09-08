import type { APIRoute } from "astro";
import { withEmbeddedCardFont } from "../../../lib/cardImage";
import { getDb } from "../../../lib/db";
import { loadMemberCard, renderMemberCardSvg } from "../../../lib/memberCard";

/**
 * The member's card as a drawing (specs/concepts/member-card.md) — the crisp
 * form, for looking at on a screen and for printing.
 *
 * An address that matches no card is a plain 404: it must not reveal which
 * organization it might have belonged to, nor that some other card exists.
 */
export const GET: APIRoute = async ({ params }) => {
  const card = await loadMemberCard(getDb(), params.token ?? "");
  if (!card) return new Response("Fant ikke medlemsbeviset", { status: 404 });

  return new Response(withEmbeddedCardFont(await renderMemberCardSvg(card)), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The pages that show the card ask for it by version (?v=, see
      // src/lib/memberCard.ts), so a card that just gained a heart is a new
      // address and never the browser's kept copy. This lifetime covers the
      // bare address, which feeds and mail clients fetch on their own; short,
      // so a stale copy there does not outlive a renewal for long either.
      "Cache-Control": "public, max-age=300",
    },
  });
};
