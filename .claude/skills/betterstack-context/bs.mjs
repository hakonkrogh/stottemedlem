#!/usr/bin/env node
// Ask Better Stack about the nightly runs' watchdog, from the CLI.
//
// Read-only by default. `create` is the one write, and it is explicit.
// Auth: BETTERSTACK_API_TOKEN (Better Stack, API tokens, team-scoped Uptime
// token or a global one). Never hardcode it, never commit it.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const TOKEN = process.env.BETTERSTACK_API_TOKEN;
const BASE = "https://uptime.betterstack.com";

// The guard lives in api(), not at the top, so the parts that only read this
// repo (check --dry) work with no account at all.
function requireToken() {
  if (TOKEN) return;
  console.error(
    "BETTERSTACK_API_TOKEN is not set.\n" +
      "Get one at Better Stack, API tokens (team-scoped Uptime token is enough),\n" +
      "then: export BETTERSTACK_API_TOKEN=...",
  );
  process.exit(2);
}

async function api(path, init = {}) {
  requireToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${path}`);
    console.error(typeof body === "string" ? body : JSON.stringify(body, null, 2));
    process.exit(1);
  }
  return body;
}

function secondsToWords(s) {
  if (s == null) return "?";
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const [cmd, ...args] = argv.filter((a) => !a.startsWith("--"));

switch (cmd) {
  case "heartbeats": {
    const { data } = await api("/api/v2/heartbeats");
    if (!data?.length) {
      console.log("no heartbeats on this account");
      break;
    }
    for (const h of data) {
      const a = h.attributes || {};
      console.log(
        [
          h.id.padEnd(9),
          (a.status || "?").padEnd(10),
          `every ${secondsToWords(a.period)}`.padEnd(12),
          `grace ${secondsToWords(a.grace)}`.padEnd(12),
          a.name,
        ].join(" "),
      );
    }
    break;
  }
  case "heartbeat": {
    if (!args[0]) throw new Error("usage: heartbeat <id>");
    console.log(JSON.stringify(await api(`/api/v2/heartbeats/${args[0]}`), null, 2));
    break;
  }
  case "create": {
    const [name, period, grace] = args;
    if (!name || !period) throw new Error("usage: create <name> <period-seconds> [grace-seconds]");
    const body = {
      name,
      period: Number(period),
      grace: Number(grace ?? Math.round(Number(period) * 0.2)),
      // The alerting spec commits to e-mail and nothing that wakes anybody.
      email: true,
      sms: false,
      call: false,
      push: false,
    };
    const out = await api("/api/v2/heartbeats", { method: "POST", body: JSON.stringify(body) });
    console.log(JSON.stringify(out, null, 2));
    console.log("\nstore this as the Worker secret:", out?.data?.attributes?.url);
    break;
  }
  case "check": {
    // The one thing nothing else can catch: a heartbeat whose "expect every"
    // does not match the cron that feeds it. Both were set to 1 day on the
    // first setup, staging included, so staging was being judged against
    // production's clock, which the spec forbids.
    const wrangler = readFileSync(resolve(REPO, "apps/backoffice/wrangler.jsonc"), "utf8");
    const worker = readFileSync(resolve(REPO, "apps/backoffice/src/worker.ts"), "utf8");

    const cronArrays = [...wrangler.matchAll(/"crons"\s*:\s*\[([^\]]*)\]/g)].map((m) =>
      [...m[1].matchAll(/"([^"]+)"/g)].map((c) => c[1]),
    );
    if (cronArrays.length < 2) {
      console.error("could not read both crons arrays from wrangler.jsonc");
      process.exit(2);
    }
    // Top-level config is production; env.staging follows it.
    const byEnvironment = { production: cronArrays[0], staging: cronArrays[1] };

    const listFrom = (name) => {
      const m = worker.match(new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
      return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((c) => c[1]) : [];
    };
    const renewals = listFrom("RENEWAL_CRONS");
    const reconcile = listFrom("RECONCILE_CRONS");

    // Only the two shapes this repo actually runs. Anything else is reported
    // rather than guessed at.
    const periodOf = (cron) => {
      const [, hour, dom, month, dow] = cron.split(/\s+/);
      if (dom !== "*" || month !== "*" || dow !== "*") return null;
      if (hour === "*") return 3600;
      if (/^\d+$/.test(hour)) return 86400;
      return null;
    };

    const dry = flags.has("--dry");
    const { data } = dry ? { data: [] } : await api("/api/v2/heartbeats");
    const rows = [];
    for (const [environment, crons] of Object.entries(byEnvironment)) {
      for (const cron of crons) {
        const job = renewals.includes(cron)
          ? "renewals"
          : reconcile.includes(cron)
            ? "reconcile"
            : "unrecognized";
        const want = periodOf(cron);
        const hit = (data || []).find((h) => {
          const n = (h.attributes?.name || "").toLowerCase();
          return n.includes(job) && n.includes(environment);
        });
        rows.push({
          label: `${job} ${environment}`,
          cron,
          want,
          got: hit?.attributes?.period ?? null,
          missing: !hit,
        });
      }
    }

    let bad = 0;
    for (const r of rows) {
      let verdict;
      if (dry) verdict = `cron implies a beat every ${secondsToWords(r.want)}`;
      else if (r.missing) verdict = "NO HEARTBEAT";
      else if (r.want == null) verdict = "cannot derive from cron, check by hand";
      else if (r.want === r.got) verdict = "ok";
      else
        verdict = `MISMATCH: expects ${secondsToWords(r.got)}, cron is ${secondsToWords(r.want)}`;
      if (!dry && verdict !== "ok") bad++;
      console.log(`${r.label.padEnd(22)} ${r.cron.padEnd(12)} ${verdict}`);
    }
    if (dry) {
      console.log("\nread from this repo only. Drop --dry to compare against the account.");
      break;
    }
    if (bad) {
      console.log(`\n${bad} heartbeat(s) do not match the cron that feeds them.`);
      process.exit(1);
    }
    console.log("\nevery heartbeat expects a beat on the cadence its cron actually keeps.");
    break;
  }
  case "raw": {
    // Escape hatch so this stays a generic surface: any documented endpoint,
    // without adding a command for it first.
    if (!args[0]) throw new Error("usage: raw <path>   e.g. raw /api/v2/monitors");
    console.log(JSON.stringify(await api(args[0]), null, 2));
    break;
  }
  default:
    console.log(
      [
        "bs.mjs <command>",
        "",
        "  heartbeats                         list every heartbeat: status, period, grace, name",
        "  heartbeat <id>                     one heartbeat in full",
        "  create <name> <period> [grace]     new heartbeat, seconds, e-mail only",
        "  check                              do the heartbeat periods match the crons?",
        "  raw <path>                         any documented GET endpoint",
        "",
        "Needs BETTERSTACK_API_TOKEN.",
      ].join("\n"),
    );
}
