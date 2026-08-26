import { getOrganizationBySlug } from "@stottemedlem/db";
import { verifyWebhookDelivery } from "@stottemedlem/vipps";
import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { logger } from "../../../lib/log";
import { applyVippsEvent, type VippsEvent } from "../../../lib/membership";
import { getVippsForOrg, testEnvironmentWebhookSecret } from "../../../lib/vipps";
import { readOrgVippsKeys } from "../../../lib/vippsKeys";
import { getWorkOS } from "../../../lib/workos";

// Where Vipps tells us what happened to an organization's payments — the
// channel that turns money into membership. One receiver per organization,
// because the secret that proves a delivery genuine is the organization's own.
//
// Deliveries are at-least-once and can arrive in any order (a first charge's
// capture routinely beats its agreement's activation), so everything downstream
// is idempotent and order-independent. Answering anything but 2xx makes Vipps
// retry with backoff for up to seven days — which is exactly what we want when
// we could not process a delivery, and never what we want when we could.
export const POST: APIRoute = async ({ params, request }) => {
  const db = getDb();
  const org = params.slug ? await getOrganizationBySlug(db, params.slug) : null;
  // 404 rather than 401: an unknown organization is not an authentication
  // problem, and there is nothing here to retry into.
  if (!org) return new Response("unknown organization", { status: 404 });

  const body = await request.text();
  const workos = getWorkOS();
  const keys = await readOrgVippsKeys(workos, org.workosOrgId);
  const secret = keys?.webhook?.secret ?? testEnvironmentWebhookSecret();
  if (!secret) {
    logger("webhooks").error("webhook received but no registration secret stored", undefined, {
      org: org.slug,
    });
    return new Response("no webhook registration", { status: 404 });
  }

  const url = new URL(request.url);
  const verified = await verifyWebhookDelivery(
    {
      method: "POST",
      pathAndQuery: `${url.pathname}${url.search}`,
      host: request.headers.get("host") ?? "",
      date: request.headers.get("x-ms-date") ?? "",
      contentSha256: request.headers.get("x-ms-content-sha256") ?? "",
      authorization: request.headers.get("authorization") ?? "",
      body,
    },
    secret,
  );
  // Anything we cannot prove came from Vipps is refused outright — an
  // unverified delivery must never move money or membership. Worth a word to
  // the operator: repeated failures mean the stored secret has drifted from
  // the registration, and Vipps is retrying a delivery we keep refusing.
  if (!verified) {
    logger("webhooks").warn("webhook signature verification failed", { org: org.slug });
    return new Response("bad signature", { status: 401 });
  }

  let event: VippsEvent;
  try {
    event = JSON.parse(body) as VippsEvent;
  } catch {
    // Malformed beyond parsing: retrying will not help either of us.
    return new Response("unparseable body", { status: 400 });
  }
  if (!event.agreementId) return new Response("no agreementId", { status: 400 });

  const vipps = await getVippsForOrg(workos, org.workosOrgId);
  if (!vipps) return new Response("organization not connected to Vipps", { status: 500 });

  try {
    await applyVippsEvent(db, vipps, event);
  } catch (error) {
    // 500 so Vipps redelivers: losing an event silently would leave a paying
    // supporter off the member list.
    logger("webhooks").error("failed to apply webhook event", error, {
      org: org.slug,
      eventType: event.eventType,
    });
    return new Response("could not apply event", { status: 500 });
  }

  return new Response(null, { status: 200 });
};
