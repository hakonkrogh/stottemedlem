import { cardTokensFromScanCode, referredJoinPath } from "@stottemedlem/core";
import { findScannedCardReferral } from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";

/**
 * Where a scanned member card lands (specs/concepts/member-card.md).
 *
 * The card's QR code carries this short address rather than the join page's
 * own, because the code has to stay small enough to scan from the card's
 * footer. Nothing happens here but the handover: the scanner is sent on to the
 * organization's ordinary join page, carrying the referral that credits a
 * completed join back to the member whose card was scanned
 * (specs/use-cases/earn-hearts-and-recruit.md).
 *
 * A code that matches nothing is a plain 404, like every other address made
 * from a member's token: it must not reveal which organization it might have
 * belonged to, nor that some other card exists.
 */
export const GET: APIRoute = async ({ params, redirect }) => {
  const referral = await findScannedCardReferral(
    getDb(),
    cardTokensFromScanCode(params.code ?? ""),
  );
  if (!referral) return new Response("Fant ikke medlemsbeviset", { status: 404 });

  // Temporary on purpose: the join page it points at is the same address for
  // everyone, and a permanent redirect kept in a browser would outlive any
  // future change to how a scan is handed over.
  return redirect(referredJoinPath(referral.orgSlug, referral.cardToken), 302);
};
