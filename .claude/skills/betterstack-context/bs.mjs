#!/usr/bin/env node
// Ask Better Stack about the nightly runs' watchdog, from the CLI.
//
// Read-only by default. `create` is the one write, and it is explicit.
// Auth: BETTERSTACK_API_TOKEN (Better Stack, API tokens, team-scoped Uptime
// token or a global one). Never hardcode it, never commit it.
const TOKEN = process.env.BETTERSTACK_API_TOKEN;
const BASE = "https://uptime.betterstack.com";

if (!TOKEN) {
  console.error(
    "BETTERSTACK_API_TOKEN is not set.\n" +
      "Get one at Better Stack, API tokens (team-scoped Uptime token is enough),\n" +
      "then: export BETTERSTACK_API_TOKEN=...",
  );
  process.exit(2);
}

async function api(path, init = {}) {
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

const [cmd, ...args] = process.argv.slice(2);

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
        "  raw <path>                         any documented GET endpoint",
        "",
        "Needs BETTERSTACK_API_TOKEN.",
      ].join("\n"),
    );
}
