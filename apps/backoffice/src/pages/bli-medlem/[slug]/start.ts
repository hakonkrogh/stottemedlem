import { JOIN_REFERRAL_PARAM } from "@stottemedlem/core";
import {
  findMemberIdByCardToken,
  getOrganizationBySlug,
  listMembershipTiers,
} from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { publicOrigin, startJoin } from "../../../lib/membership";
import { getVippsForOrg } from "../../../lib/vipps";
import { getWorkOS } from "../../../lib/workos";

// Where joining begins (specs/use-cases/join-as-supporting-member.md): the
// supporter picks a membership on the join page and is handed straight to
// Vipps. A POST, not a link, because it creates something on Vipps' side —
// and because the join page itself is cached, so it must carry no per-visitor
// state of its own.
export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug;
  const db = getDb();
  const org = slug ? await getOrganizationBySlug(db, slug) : null;
  if (!org) return new Response("Fant ikke organisasjonen", { status: 404 });

  const tiers = await listMembershipTiers(db, org.id);
  const form = await request.formData();
  const wanted = String(form.get("medlemskap") ?? "");
  // A named tier must exist; with a single membership on offer, naming it is
  // unnecessary. An unknown name is a stale link, not a reason to guess.
  const tier = wanted ? tiers.find((t) => t.key === wanted) : tiers[0];
  if (!tier) return redirectToJoinPage(org.slug, "ukjent-medlemskap");

  const vipps = await getVippsForOrg(getWorkOS(), org.workosOrgId);
  if (!vipps) return redirectToJoinPage(org.slug, "ikke-klar");

  // Word of mouth, carried from a scanned member card
  // (specs/use-cases/earn-hearts-and-recruit.md). A token nobody recognizes is
  // no reason to refuse a payment: the join goes ahead unattributed.
  const referral = String(form.get(JOIN_REFERRAL_PARAM) ?? "").trim();
  const referredByMemberId = referral ? await findMemberIdByCardToken(db, org.id, referral) : null;

  try {
    const { confirmationUrl } = await startJoin(
      db,
      vipps,
      org,
      tier,
      publicOrigin(request),
      referredByMemberId,
    );
    // 303: the browser must follow with GET, and the back button must not
    // re-post and draft a second agreement.
    return new Response(null, { status: 303, headers: { location: confirmationUrl } });
  } catch (error) {
    console.error("could not start join", error);
    return redirectToJoinPage(org.slug, "vipps-feil");
  }
};

/** Back to the join page, which explains what went wrong in plain Norwegian. */
function redirectToJoinPage(slug: string, reason: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location: `/bli-medlem/${slug}?feil=${reason}` },
  });
}
