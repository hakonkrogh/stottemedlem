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
      // Short: a card gains a heart the moment a renewal is paid, and the
      // member should not have to explain to anyone why theirs looks stale.
      "Cache-Control": "public, max-age=300",
    },
  });
};
