import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import {
  loadMemberCard,
  memberCardShapeFromQuery,
  renderMemberCardSvg,
} from "../../../lib/memberCard";

/**
 * The member's card as a drawing (specs/concepts/member-card.md) — the crisp
 * form, for looking at on a screen and for printing.
 *
 * `?form=staaende` asks for the upright card, which is what a phone-width
 * surface shows: a picture keeps its aspect ratio, so the wide card poured
 * into a narrow column shrinks its QR code past scanning.
 *
 * An address that matches no card is a plain 404: it must not reveal which
 * organization it might have belonged to, nor that some other card exists.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const card = await loadMemberCard(getDb(), params.token ?? "");
  if (!card) return new Response("Fant ikke medlemsbeviset", { status: 404 });

  return new Response(await renderMemberCardSvg(card, memberCardShapeFromQuery(url)), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short: a card gains a heart the moment a renewal is paid, and the
      // member should not have to explain to anyone why theirs looks stale.
      "Cache-Control": "public, max-age=300",
    },
  });
};
