#!/usr/bin/env node
/**
 * End-to-end harness for a REAL yearly Vipps recurring subscription against the
 * TEST environment (apitest.vipps.no) — the rehearsal the product flow is built
 * on. It drives the whole lifecycle from the command line, so the Vipps side is
 * proven before any of it is wired into the back office:
 *
 *   agreement → (approve in the MT app) → status → userinfo → charges
 *             → charge (next year's) → stop
 *
 * plus `listen`, a local receiver for the two things Vipps calls back into:
 * webhook deliveries (HMAC-verified) and the mandatory management page
 * (merchantAgreementUrl). Expose it with `pnpm --filter @stottemedlem/vipps run tunnel`.
 *
 * Nothing here touches the product database — this is a rig for exercising
 * Vipps itself. Runbook: docs/vipps-local-recurring-test.md
 *
 * Run: pnpm --filter @stottemedlem/vipps run recurring-test <command> [options]
 */
import { createServer } from "node:http";
import {
  createVippsClient,
  RECURRING_WEBHOOK_EVENTS,
  signWebhookDelivery,
  VippsApiError,
  verifyWebhookDelivery,
} from "../dist/index.js";
import { loadVippsConfig, publicBaseUrl, readState, statePath, writeState } from "./config.mjs";

// ── Arguments ──────────────────────────────────────────────────────────────

const [command = "help", ...rest] = process.argv.slice(2);

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [name, inline] = token.slice(2).split("=");
    if (inline !== undefined) {
      flags[name] = inline;
    } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) {
      flags[name] = argv[++i];
    } else {
      flags[name] = true;
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseFlags(rest);

// ── Helpers ────────────────────────────────────────────────────────────────

const config = command === "help" ? null : loadVippsConfig();
const client = config ? createVippsClient(config) : null;

/** Vipps wants minor units everywhere; the product speaks whole kroner. */
const toOre = (nok) => Math.round(Number(nok) * 100);
const fromOre = (ore) => (ore / 100).toFixed(2);

function idempotencyKey() {
  return crypto.randomUUID();
}

/** `YYYY-MM-DD`, `days` from today — charges need at least 1 day of lead time. */
function dueDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

/** The agreement this command works on: --agreement, a positional id, or the last one. */
function currentAgreementId() {
  const id = flags.agreement ?? positional[0] ?? readState().agreementId;
  if (!id || typeof id !== "string") {
    console.error("No agreement id. Pass --agreement <id>, or run `agreement` first.");
    process.exit(1);
  }
  return id;
}

function requirePublicUrl() {
  const url = publicBaseUrl(typeof flags["public-url"] === "string" ? flags["public-url"] : "");
  if (!url) {
    console.error("No public HTTPS URL. Vipps must be able to reach this machine for the");
    console.error("management page, the redirect and webhooks. Start a tunnel first:");
    console.error("  pnpm --filter @stottemedlem/vipps run tunnel");
    console.error("or pass --public-url https://<host>");
    process.exit(1);
  }
  return url;
}

function print(label, value) {
  console.log(`${label.padEnd(22)}${value}`);
}

/** A scannable QR so the confirmation URL reaches the phone with the MT app. */
async function printQr(url) {
  try {
    const { default: qrcode } = await import("qrcode");
    console.log(await qrcode.toString(url, { type: "terminal", small: true }));
  } catch {
    console.log("(install the `qrcode` dev dependency for a scannable QR here)");
  }
}

function reportApiError(error) {
  if (error instanceof VippsApiError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

// ── Commands ───────────────────────────────────────────────────────────────

/**
 * Draft the agreement a supporting membership is: a yearly, fixed-price
 * agreement with the first year charged on approval, asking for the profile
 * data a member list needs.
 */
async function createAgreement() {
  const publicUrl = requirePublicUrl();
  const amountNok = flags.amount ?? 250;
  const productName = typeof flags.name === "string" ? flags.name : "Støttemedlem";
  const externalId =
    typeof flags["external-id"] === "string" ? flags["external-id"] : `test:${Date.now()}`;

  const body = {
    pricing: { type: "LEGACY", amount: toOre(amountNok), currency: "NOK" },
    interval: { unit: "YEAR", count: 1 },
    merchantRedirectUrl: `${publicUrl}/retur`,
    merchantAgreementUrl: `${publicUrl}/min-side`,
    productName,
    productDescription:
      typeof flags.description === "string"
        ? flags.description
        : "Årlig støttemedlemskap som fornyes til du sier opp.",
    scope: "name email phoneNumber",
    externalId,
  };
  if (flags["no-charge"] !== true) {
    body.initialCharge = {
      amount: toOre(amountNok),
      description: `${productName} — første år`,
      transactionType: "DIRECT_CAPTURE",
    };
  }
  if (typeof flags.phone === "string") body.phoneNumber = flags.phone;

  const draft = await client.draftAgreement(body, idempotencyKey()).catch(reportApiError);
  writeState({
    agreementId: draft.agreementId,
    chargeId: draft.chargeId ?? null,
    externalId,
    amountNok: Number(amountNok),
    productName,
    // Kept because Vipps never returns it again and it is the only way to the
    // approval screen — `confirm` reprints it (and the QR) for a second phone.
    confirmationUrl: draft.vippsConfirmationUrl,
    createdAt: new Date().toISOString(),
  });

  console.log("Agreement drafted (status PENDING until approved in the app).\n");
  print("agreementId", draft.agreementId);
  print("initial chargeId", draft.chargeId ?? "(none — --no-charge)");
  print("amount", `${amountNok} NOK / year`);
  print("management page", body.merchantAgreementUrl);
  print("redirect after approval", body.merchantRedirectUrl);
  console.log(
    `\nApprove it in the Merchant Test (MT) app — open on the phone:\n${draft.vippsConfirmationUrl}\n`,
  );
  await printQr(draft.vippsConfirmationUrl);
  // The deeplink token lives 10 minutes (exp = iat + 600), so draft when the
  // phone is already in hand; `confirm` reprints it while it lasts.
  console.log("This link expires in ~10 minutes — draft again if it lapses.");
  console.log("Then: recurring-test status --watch");
}

/** Poll to a final status, per Vipps' polling guidance: start at 5 s, every 2 s. */
/** Reprint the pending agreement's approval URL — drafting again would orphan it. */
async function confirmUrl() {
  const url = readState().confirmationUrl;
  if (!url) {
    console.error("No confirmation URL saved. Run `agreement` first.");
    process.exit(1);
  }
  console.log(`${url}\n`);
  await printQr(url);
}

async function agreementStatus() {
  const agreementId = currentAgreementId();
  const watch = flags.watch === true;
  const deadline = Date.now() + 10 * 60 * 1000;

  for (;;) {
    const agreement = await client.getAgreement(agreementId).catch(reportApiError);
    const settled = agreement.status !== "PENDING";
    if (!watch || settled) {
      print("agreementId", agreement.id);
      print("status", agreement.status);
      print("product", agreement.productName);
      print("pricing", `${fromOre(agreement.pricing.amount)} ${agreement.pricing.currency}`);
      print("interval", `${agreement.interval.count} × ${agreement.interval.unit}`);
      print("externalId", agreement.externalId ?? "—");
      if (agreement.sub) {
        writeState({ sub: agreement.sub });
        print("sub (userinfo)", agreement.sub);
        console.log("\nProfile data is fetchable for 168 hours: recurring-test userinfo");
      }
      if (settled && agreement.status !== "ACTIVE") {
        console.log("\nNot active — a rejected or stopped agreement never becomes a membership.");
      }
      return;
    }
    if (Date.now() > deadline) {
      console.log("Still PENDING after 10 minutes — approve it in the MT app, then poll again.");
      return;
    }
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/** The member's consented name/email/phone — what a member list is built from. */
async function userinfo() {
  const sub = typeof flags.sub === "string" ? flags.sub : readState().sub;
  if (!sub) {
    console.error("No `sub` yet. Run `status` on an ACTIVE agreement first (it saves the sub).");
    process.exit(1);
  }
  const profile = await client.getUserinfo(sub).catch(reportApiError);
  console.log(JSON.stringify(profile, null, 2));
}

async function listCharges() {
  const agreementId = currentAgreementId();
  const charges = await client.listCharges(agreementId).catch(reportApiError);
  if (charges.length === 0) {
    console.log("No charges on this agreement.");
    return;
  }
  for (const charge of charges) {
    console.log(
      [
        charge.id,
        charge.type.padEnd(11),
        charge.status.padEnd(9),
        `${fromOre(charge.amount)} NOK`.padStart(12),
        `due ${charge.due}`,
        charge.failureDescription ? `(${charge.failureDescription})` : "",
      ].join("  "),
    );
  }
}

/** Next year's charge — the renewal the scheduled job will create in production. */
async function createCharge() {
  const agreementId = currentAgreementId();
  const state = readState();
  const amountNok = flags.amount ?? state.amountNok ?? 250;
  const due = typeof flags.due === "string" ? flags.due : dueDate(flags.days ?? 1);
  const retryDays = Number(flags["retry-days"] ?? 7);

  const { chargeId } = await client
    .createCharge(
      agreementId,
      {
        amount: toOre(amountNok),
        description: `${state.productName ?? "Støttemedlem"} — fornyelse`,
        due,
        retryDays,
        transactionType: "DIRECT_CAPTURE",
        externalId: `test-renewal:${Date.now()}`,
      },
      idempotencyKey(),
    )
    .catch(reportApiError);

  writeState({ renewalChargeId: chargeId });
  print("chargeId", chargeId);
  print("amount", `${amountNok} NOK`);
  print("due", due);
  print("retryDays", retryDays);
  console.log("\nVipps processes it on the due date — it stays PENDING/DUE until then.");
}

async function cancelCharge() {
  const agreementId = currentAgreementId();
  const chargeId = typeof flags.charge === "string" ? flags.charge : readState().renewalChargeId;
  if (!chargeId) {
    console.error("No charge id. Pass --charge <id>.");
    process.exit(1);
  }
  await client.cancelCharge(agreementId, chargeId, idempotencyKey()).catch(reportApiError);
  console.log(`Cancelled charge ${chargeId}.`);
}

/** Merchant-side stop. Irreversible — Vipps has no way back to ACTIVE. */
async function stopAgreement() {
  const agreementId = currentAgreementId();
  await client
    .updateAgreement(agreementId, { status: "STOPPED" }, idempotencyKey())
    .catch(reportApiError);
  console.log(`Stopped agreement ${agreementId} (irreversible).`);
}

/**
 * Post a signed event at a receiver, exactly as Vipps signs one — so the
 * product's webhook route can be exercised without waiting for a real payment.
 * The secret comes from the last `webhooks register`, which is the same secret
 * the receiver verifies against.
 *
 * `--tamper` changes one byte of the signature: a receiver that accepts that
 * is broken, and this is the cheapest way to keep proving it does not.
 */
async function deliver() {
  const state = readState();
  const secret =
    typeof flags.secret === "string"
      ? flags.secret
      : (process.env.VIPPS_WEBHOOK_SECRET ?? state.webhookSecret);
  if (!secret) {
    console.error("No webhook secret. Run `webhooks register` first, or pass --secret <value>.");
    process.exit(1);
  }
  const target = new URL(
    typeof flags.to === "string" ? flags.to : (state.webhookUrl ?? `${requirePublicUrl()}/webhook`),
  );
  const eventType = typeof flags.event === "string" ? flags.event : "recurring.charge-captured.v1";
  const chargeId = typeof flags.charge === "string" ? flags.charge : state.chargeId;
  const body = JSON.stringify({
    eventType,
    agreementId: currentAgreementId(),
    ...(chargeId ? { chargeId } : {}),
    msn: config.merchantSerialNumber,
  });

  const date = new Date().toUTCString();
  const signed = await signWebhookDelivery(
    {
      method: "POST",
      pathAndQuery: `${target.pathname}${target.search}`,
      host: target.host,
      date,
      body,
    },
    secret,
  );
  const authorization =
    flags.tamper === true ? `${signed.authorization.slice(0, -1)}A` : signed.authorization;

  const response = await fetch(target, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ms-date": date,
      "x-ms-content-sha256": signed.contentSha256,
      authorization,
    },
    body,
  });
  console.log(
    `${flags.tamper === true ? "tampered" : "genuine "} ${eventType} → HTTP ${response.status}`,
  );
  const text = await response.text();
  if (text) console.log(text.slice(0, 200));
}

async function webhooks() {
  const action = positional[0] ?? "list";

  if (action === "register") {
    const url = `${requirePublicUrl()}/webhook`;
    const registration = await client
      .registerWebhook({ url, events: RECURRING_WEBHOOK_EVENTS })
      .catch(reportApiError);
    writeState({ webhookId: registration.id, webhookSecret: registration.secret, webhookUrl: url });
    print("webhookId", registration.id);
    print("url", url);
    print("events", `${RECURRING_WEBHOOK_EVENTS.length} recurring events`);
    console.log(`\nSecret saved to ${statePath} — Vipps shows it only once.`);
    console.log("Now run: recurring-test listen");
    return;
  }

  if (action === "delete") {
    const id = positional[1] ?? readState().webhookId;
    if (!id) {
      console.error("No webhook id. Pass one: webhooks delete <id>");
      process.exit(1);
    }
    await client.deleteWebhook(id).catch(reportApiError);
    console.log(`Deleted webhook ${id}.`);
    return;
  }

  const { webhooks: registrations } = await client.listWebhooks().catch(reportApiError);
  if (registrations.length === 0) {
    console.log("No webhook registrations for this sales unit.");
    return;
  }
  for (const hook of registrations) {
    console.log(`${hook.id}  ${hook.url}  (${hook.events.length} events)`);
  }
  console.log("\nA tunnel URL changes on every restart — delete stale registrations.");
}

// ── listen: the two surfaces Vipps calls back into ─────────────────────────

const BRAND_LINK =
  '<p style="margin-top:3rem;font-size:.8rem;color:#8a8178">' +
  '<a href="https://xn--stttemedlem-hgb.no" style="color:inherit">støttemedlem.no</a></p>';

function page(title, body) {
  return `<!doctype html><html lang="no"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1.25rem;color:#2b2723}
button{font:inherit;padding:.6rem 1.1rem;border-radius:.5rem;border:1px solid #d8d0c6;background:#f2b64a;cursor:pointer}
code{background:#f5f1ea;padding:.1rem .3rem;border-radius:.25rem}</style></head>
<body>${body}${BRAND_LINK}</body></html>`;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Local stand-in for the two URLs every agreement carries:
 *   /min-side  — the management page Norwegian merchants MUST provide, and it
 *                must offer actual management, so stopping works here.
 *   /retur     — where Vipps sends the member after approving.
 * plus /webhook, the HMAC-verified receiver for the ten recurring events.
 */
function listen() {
  const port = Number(flags.port ?? 8788);

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const send = (status, contentType, body) => {
      response.writeHead(status, { "content-type": contentType });
      response.end(body);
    };
    const handled = handle(request, url, send).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      if (!response.headersSent) send(500, "text/plain", "error");
    });
    return handled;
  });

  async function handle(request, url, send) {
    if (request.method === "POST" && url.pathname === "/webhook") {
      const body = await readBody(request);
      const secret = readState().webhookSecret;
      const verified = secret
        ? await verifyWebhookDelivery(
            {
              method: "POST",
              pathAndQuery: request.url,
              host: request.headers.host ?? "",
              date: request.headers["x-ms-date"] ?? "",
              contentSha256: request.headers["x-ms-content-sha256"] ?? "",
              authorization: request.headers.authorization ?? "",
              body,
            },
            secret,
          )
        : false;

      let event;
      try {
        event = JSON.parse(body);
      } catch {
        event = { raw: body };
      }
      const stamp = new Date().toISOString().slice(11, 19);
      console.log(
        `${stamp}  ${verified ? "✓ verified" : "✗ SIGNATURE FAILED"}  ${event.eventType ?? "?"}`,
      );
      console.log(`${JSON.stringify(event, null, 2)}\n`);
      // 401 makes Vipps retry, which is what an unverifiable delivery deserves.
      return send(verified ? 200 : 401, "text/plain", verified ? "ok" : "bad signature");
    }

    if (request.method === "POST" && url.pathname === "/min-side/stopp") {
      const agreementId = readState().agreementId;
      if (!agreementId) return send(404, "text/plain", "no agreement to stop");
      await client.updateAgreement(agreementId, { status: "STOPPED" }, idempotencyKey());
      console.log(`Member stopped agreement ${agreementId} from the management page.`);
      return send(
        200,
        "text/html; charset=utf-8",
        page(
          "Medlemskapet er sagt opp",
          "<h1>Medlemskapet er sagt opp</h1><p>Du blir ikke belastet igjen.</p>",
        ),
      );
    }

    if (url.pathname === "/min-side") {
      const state = readState();
      const agreement = state.agreementId
        ? await client.getAgreement(state.agreementId).catch(() => null)
        : null;
      return send(
        200,
        "text/html; charset=utf-8",
        page(
          "Min side",
          `<h1>Ditt støttemedlemskap</h1>
<p>${agreement ? `<strong>${agreement.productName}</strong> — ${fromOre(agreement.pricing.amount)} kr i året. Status: <code>${agreement.status}</code>.` : "Fant ingen avtale."}</p>
<form method="post" action="/min-side/stopp"><button type="submit">Si opp medlemskapet</button></form>
<p><em>Lokal testside — står inn for den obligatoriske «min side» i den ekte flyten.</em></p>`,
        ),
      );
    }

    if (url.pathname === "/retur") {
      const state = readState();
      const agreement = state.agreementId
        ? await client.getAgreement(state.agreementId).catch(() => null)
        : null;
      console.log(`Member returned from Vipps — agreement is ${agreement?.status ?? "unknown"}.`);
      return send(
        200,
        "text/html; charset=utf-8",
        page(
          "Takk!",
          `<h1>Takk for støtten!</h1>
<p>Avtalen har status <code>${agreement?.status ?? "ukjent"}</code>.</p>
<p><em>PENDING her er normalt — medlemskapet aktiveres først når Vipps bekrefter det (webhook eller polling), aldri av denne siden alene.</em></p>`,
        ),
      );
    }

    return send(404, "text/plain", "not found");
  }

  server.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
    console.log("  POST /webhook    — HMAC-verified Vipps deliveries");
    console.log("  GET  /min-side   — merchantAgreementUrl (can stop the agreement)");
    console.log("  GET  /retur      — merchantRedirectUrl landing page");
    const publicUrl = publicBaseUrl();
    console.log(
      publicUrl
        ? `Public: ${publicUrl}`
        : "No tunnel yet — run `pnpm --filter @stottemedlem/vipps run tunnel`.",
    );
  });
}

function help() {
  console.log(`Vipps recurring test harness — TEST environment only (apitest.vipps.no)

  agreement       Draft a yearly agreement + first-year charge, print confirmation URL + QR
                    --amount 250  --name "Støttemedlem"  --phone 4712345678  --no-charge
  confirm         Reprint the approval URL + QR for the pending agreement
  status          Show the agreement; --watch polls until it leaves PENDING
  userinfo        The member's consented name/email/phone (168-hour window)
  charges         List the agreement's charges
  charge          Create next year's charge  --days 1 | --due YYYY-MM-DD  --amount 250
  cancel-charge   Cancel a PENDING/DUE charge  --charge <id>
  stop            Stop the agreement (irreversible)
  webhooks        list | register | delete <id>
  deliver         Post a signed event at a receiver, as Vipps would sign it
                    --event <type>  --to <url>  --charge <id>  --tamper
  listen          Local /webhook + /min-side + /retur receiver  --port 8788
  state           Print the saved ids
  reset           Forget the saved ids

Every command takes --agreement <id>; without it the last drafted one is used.
Prerequisites and the full walkthrough: docs/vipps-local-recurring-test.md`);
}

const commands = {
  agreement: createAgreement,
  confirm: confirmUrl,
  status: agreementStatus,
  userinfo,
  charges: listCharges,
  charge: createCharge,
  "cancel-charge": cancelCharge,
  stop: stopAgreement,
  webhooks,
  deliver,
  listen,
  state: () => console.log(JSON.stringify(readState(), null, 2)),
  reset: () => {
    writeState({ agreementId: null, chargeId: null, renewalChargeId: null, sub: null });
    console.log("State cleared (webhook registration kept — delete it with `webhooks delete`).");
  },
  help,
};

const run = commands[command];
if (!run) {
  console.error(`Unknown command: ${command}\n`);
  help();
  process.exit(1);
}
await run();
