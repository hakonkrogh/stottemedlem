#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Does the CANONICAL APEX actually serve every public address the product
// hands out? See SKILL.md, "Is the apex serving it?".
//
// The apex (støttemedlem.no) belongs to the MARKETING worker's custom domain.
// The backoffice reaches it only through the zone routes listed in
// apps/backoffice/wrangler.jsonc, and anything not listed there falls through
// to marketing's static assets and 404s. Nothing local catches that: dev,
// typecheck, unit tests and routes.mjs against localhost all pass while the
// deployed address is dead (that is exactly how /api/qr/* shipped broken).
//
// Two checks, both cheap:
//   static  every address below is covered by a route pattern in wrangler.jsonc
//   --live  fetch it on the real apex and see WHICH worker answered
//
// Deliberately plain fetch + no deps, like routes.mjs: it must run in a fresh
// worktree before `pnpm install`.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const WRANGLER = resolve(repoRoot, "apps/backoffice/wrangler.jsonc");

/**
 * Every path the product PRINTS, EMBEDS or HANDS OUT on the canonical origin.
 * Add a row whenever a new public address is handed out on the apex, and the
 * next session finds out before an administrator does.
 *
 * `probe` is a path that the backoffice answers WITHOUT any database row, so
 * this runs against production without touching or needing real data. What is
 * asserted is which worker replied, never the status: an unknown org 404s from
 * the backoffice, and that is a pass.
 */
const PUBLIC_APEX_ADDRESSES = [
  {
    path: "/bli-medlem/",
    probe: "/bli-medlem/finnes-ikke-apex-probe",
    what: "join page, salgsvilkår and QR code card (specs/concepts/join-page.md)",
    handedOutBy: "shareableJoinUrl / shareableJoinTermsUrl / shareableQrCardUrl",
  },
  {
    path: "/org/",
    probe: "/org/finnes-ikke-apex-probe",
    what: "the join page's former address, 301ed in worker.ts",
    handedOutBy: "printed material and Vipps merchant records that predate the rename",
  },
  {
    path: "/api/qr/",
    probe: "/api/qr/finnes-ikke-apex-probe",
    what: "the QR card's former address, 301ed to /bli-medlem/<slug>/qr",
    handedOutBy: "external websites that embedded it before the card moved",
  },
  {
    path: "/medlemsbevis/",
    probe: "/medlemsbevis/finnes-ikke-apex-probe",
    what: "a member's card (specs/concepts/member-card.md)",
    handedOutBy: "memberCardUrl, and every chat the member shares it into",
  },
  {
    path: "/v/",
    probe: "/v/ZZZZZZZZ",
    what: "where a scanned member card hands over",
    handedOutBy: "the QR code drawn on the member card",
  },
  {
    path: "/V/",
    probe: "/V/ZZZZZZZZ",
    what: "the same address SHOUTING, which is what the camera reads",
    handedOutBy: "the QR code drawn on the member card",
  },
];

/** The marketing 404 page. Seeing this means the request never reached the backoffice. */
const MARKETING_FALLTHROUGH = "<title>Fant ikke siden";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`usage: node apex-routes.mjs [--live] [--env production|staging]

  (default)  static: every public apex address is covered by a zone route in
             apps/backoffice/wrangler.jsonc
  --live     also fetch each address on the real origin and report which
             worker answered (backoffice, or marketing's 404 fall-through)
  --env      which deployment to read routes from and probe (default production)

exit 0 = every address is served by the backoffice.`);
  process.exit(0);
}
const live = args.includes("--live");
const envArg = args[args.indexOf("--env") + 1];
const env = args.includes("--env") ? envArg : "production";
if (!["production", "staging"].includes(env)) {
  console.error(`FAIL  unknown --env ${env} (use production or staging)`);
  process.exit(2);
}

/** JSONC minus its comments. Enough for a config file wrangler itself parses. */
function readJsonc(path) {
  const source = readFileSync(path, "utf8");
  const stripped = source.replace(/^\s*\/\/.*$/gm, "").replace(/([^:"])\/\/[^"\n]*$/gm, "$1");
  return JSON.parse(stripped);
}

const config = readJsonc(WRANGLER);
const section = env === "production" ? config : config.env?.[env];
if (!section) {
  console.error(`FAIL  no "${env}" environment in ${WRANGLER}`);
  process.exit(2);
}
const routes = section.routes ?? [];

// The origin the product hands out on this deployment. Production's is the
// canonical apex; staging hands out its own app host (JOIN_PAGE_ORIGIN), which
// is a custom domain and therefore serves every path already.
const apexRoute = routes.find((route) => route.custom_domain !== true);
const shareableOrigin =
  env === "production"
    ? "https://xn--stttemedlem-hgb.no"
    : (section.vars?.JOIN_PAGE_ORIGIN ?? "").replace(/\/+$/, "");
const customDomains = routes
  .filter((route) => route.custom_domain === true)
  .map((route) => `https://${route.pattern}`);
// A custom domain routes the WHOLE host to this worker, so if the shareable
// origin is one of them every address below is served by definition.
const wholeHostIsOurs = customDomains.includes(shareableOrigin);

const zonePatterns = routes.filter((route) => route.custom_domain !== true).map((r) => r.pattern);

function coveredByRoute(path) {
  if (wholeHostIsOurs) return true;
  const host = shareableOrigin.replace(/^https?:\/\//, "");
  return zonePatterns.some((pattern) => {
    if (!pattern.startsWith(`${host}/`)) return false;
    const prefix = pattern.slice(host.length).replace(/\*$/, "");
    // Route patterns match case-sensitively, which is why /v/* and /V/* are
    // both listed; compare the same way.
    return path.startsWith(prefix) || prefix.startsWith(path);
  });
}

const failures = [];
console.log(
  `apex routes: ${env} → ${shareableOrigin}${wholeHostIsOurs ? " (custom domain: whole host)" : ""}`,
);
if (!shareableOrigin) {
  console.error(`FAIL  ${env} hands out no shareable origin (no JOIN_PAGE_ORIGIN var)`);
  process.exit(2);
}
if (apexRoute && !wholeHostIsOurs) {
  console.log(`zone routes: ${zonePatterns.join(", ")}`);
}

for (const address of PUBLIC_APEX_ADDRESSES) {
  const covered = coveredByRoute(address.path);
  const label = `${address.path.padEnd(16)} ${address.what}`;
  if (!covered) {
    failures.push(
      `${address.path} has NO route in ${env}: the apex answers it from the marketing worker (404).\n` +
        `        handed out by: ${address.handedOutBy}\n` +
        `        fix: add { "pattern": "xn--stttemedlem-hgb.no${address.path}*", "zone_name": "xn--stttemedlem-hgb.no" } to apps/backoffice/wrangler.jsonc`,
    );
    console.log(`FAIL  route   ${label}`);
    continue;
  }
  console.log(`ok    route   ${label}`);
}

if (live) {
  console.log("");
  for (const address of PUBLIC_APEX_ADDRESSES) {
    const url = `${shareableOrigin}${address.probe}`;
    let response;
    let body = "";
    try {
      response = await fetch(url, { redirect: "manual" });
      body = await response.text();
    } catch (error) {
      failures.push(`${url} could not be reached: ${error.message}`);
      console.log(`FAIL  live    ${address.path} (${error.message})`);
      continue;
    }
    const fellThrough = body.includes(MARKETING_FALLTHROUGH);
    const served = fellThrough ? "marketing 404" : "backoffice";
    const line = `${address.path.padEnd(16)} ${response.status} ${response.headers.get("content-type") ?? ""} ← ${served}`;
    if (fellThrough) {
      failures.push(
        `${url} is answered by the MARKETING worker, not the backoffice.\n` +
          "        A route may be missing, or present in wrangler.jsonc but not deployed yet.",
      );
      console.log(`FAIL  live    ${line}`);
    } else {
      console.log(`ok    live    ${line}`);
    }
  }
}

console.log("");
if (failures.length > 0) {
  for (const failure of failures) console.log(`FAIL  ${failure}`);
  process.exit(1);
}
console.log(
  `every public apex address is served by the backoffice (${env}${live ? ", live" : ", config"}).`,
);
