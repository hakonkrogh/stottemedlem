#!/usr/bin/env node
// Search the DEPLOYED backoffice Workers' stored logs (Cloudflare Workers
// Observability telemetry query API) from the CLI, in an agent-greppable form.
//
//   node .claude/skills/cloud-logs/cloudlogs.mjs [command] [options]
//
// Commands: events (default) | invocations | count | keys | values <key>
// See SKILL.md next to this file for usage, auth setup, and examples.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT_ID = "9060f19fa0a38d810a96cda89572ce47";
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/observability/telemetry`;
const TOKEN_FILE = join(homedir(), ".config", "stottemedlem", "cloudflare-logs-token");
const SERVICES = {
	production: "stottemedlem-backoffice",
	staging: "stottemedlem-backoffice-staging",
};

function fail(msg) {
	console.error(msg);
	process.exit(1);
}

function token() {
	const env = process.env.CLOUDFLARE_LOGS_API_TOKEN;
	if (env) return env.trim();
	try {
		return readFileSync(TOKEN_FILE, "utf8").trim();
	} catch {
		fail(
			`No API token. The wrangler OAuth login has no observability scope, so this
needs a real Cloudflare API token (read-only), minted in the dashboard:

  1. dash.cloudflare.com/profile/api-tokens -> Create Token -> Custom
  2. Permission: Account -> Workers Observability -> Read
  3. Account resource: the stottemedlem account (${ACCOUNT_ID})
  4. Save it (one line, no quotes) to: ${TOKEN_FILE}
     mkdir -p ~/.config/stottemedlem && pbpaste > ${TOKEN_FILE}

(or export CLOUDFLARE_LOGS_API_TOKEN)`,
		);
	}
}

// ── arg parsing ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opts = {
	env: "production",
	service: null,
	all: false,
	since: "1h",
	from: null,
	to: null,
	search: null,
	regex: false,
	level: null,
	filters: [],
	exists: [],
	limit: 50,
	json: false,
	full: false,
	cursor: null,
	groupBy: "$metadata.message",
};
let command = "events";
const positional = [];
for (let i = 0; i < args.length; i++) {
	const a = args[i];
	const next = () => {
		if (i + 1 >= args.length) fail(`missing value for ${a}`);
		return args[++i];
	};
	if (a === "--env" || a === "-e") opts.env = next();
	else if (a === "--service") opts.service = next();
	else if (a === "--all") opts.all = true;
	else if (a === "--since") opts.since = next();
	else if (a === "--from") opts.from = next();
	else if (a === "--to") opts.to = next();
	else if (a === "--search" || a === "-s") opts.search = next();
	else if (a === "--regex") opts.regex = true;
	else if (a === "--level") opts.level = next();
	else if (a === "--filter" || a === "-f") opts.filters.push(next());
	else if (a === "--exists") opts.exists.push(next());
	else if (a === "--limit" || a === "-n") opts.limit = Number(next());
	else if (a === "--json") opts.json = true;
	else if (a === "--full") opts.full = true;
	else if (a === "--cursor") opts.cursor = next();
	else if (a === "--group-by") opts.groupBy = next();
	else if (a === "--help" || a === "-h") {
		console.log(
			`usage: cloudlogs.mjs [events|invocations|count|keys|values <key>] [options]
  -e, --env production|staging   which deployed worker (default: production)
      --service NAME             explicit $metadata.service (overrides --env)
      --all                      no service filter (whole account)
      --since 30m|6h|2d          how far back (default 1h; retention is 7 days)
      --from/--to ISO|epoch-ms   explicit window (override --since)
  -s, --search TEXT              full-text search across all fields (--regex)
      --level error|warn|log     filter $metadata.level
  -f, --filter 'key<op>value'    repeatable; ops: = != ~ !~ ^= $= > >= < <=
      --exists KEY               repeatable; only events where KEY exists
  -n, --limit N                  max events / groups (default 50)
      --cursor ID                next page ($metadata.id of last event)
      --group-by KEY             for count (default $metadata.message)
      --json                     raw API JSON instead of formatted lines
      --full                     don't truncate long payloads`,
		);
		process.exit(0);
	} else if (a.startsWith("-")) fail(`unknown option ${a} (try --help)`);
	else positional.push(a);
}
if (positional.length) command = positional.shift();
if (!["events", "invocations", "count", "keys", "values"].includes(command))
	fail(`unknown command "${command}" (events|invocations|count|keys|values)`);
if (opts.env === "prod") opts.env = "production";
if (!opts.all && !opts.service) {
	opts.service = SERVICES[opts.env];
	if (!opts.service) fail(`unknown --env "${opts.env}" (production|staging)`);
}

// ── time window ────────────────────────────────────────────────────────────
function parseWhen(v) {
	if (/^\d{12,}$/.test(v)) return Number(v);
	const t = Date.parse(v);
	if (Number.isNaN(t)) fail(`cannot parse time "${v}"`);
	return t;
}
function parseSince(v) {
	const m = /^(\d+)([mhd])$/.exec(v);
	if (!m) fail(`--since wants 30m / 6h / 2d, got "${v}"`);
	return Number(m[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
}
const to = opts.to ? parseWhen(opts.to) : Date.now();
const from = opts.from ? parseWhen(opts.from) : to - parseSince(opts.since);

// ── filters ────────────────────────────────────────────────────────────────
const OPS = [
	["!~", "not_includes"],
	["^=", "starts_with"],
	["$=", "ends_with"],
	[">=", "gte"],
	["<=", "lte"],
	["!=", "neq"],
	["~", "includes"],
	["=", "eq"],
	[">", "gt"],
	["<", "lt"],
];
function leaf(key, operation, value, type) {
	return { kind: "filter", key, operation, value, type };
}
const filters = [];
if (opts.service)
	filters.push(leaf("$metadata.service", "eq", opts.service, "string"));
if (opts.level) filters.push(leaf("$metadata.level", "eq", opts.level, "string"));
for (const raw of opts.filters) {
	const hit = OPS.map(([sym, op]) => [raw.indexOf(sym), sym, op])
		.filter(([idx]) => idx > 0)
		.sort((a, b) => a[0] - b[0])[0];
	if (!hit) fail(`--filter "${raw}" has no operator (= != ~ !~ ^= $= > >= < <=)`);
	const [idx, sym, op] = hit;
	const key = raw.slice(0, idx);
	const rawVal = raw.slice(idx + sym.length);
	const numeric = /^-?\d+(\.\d+)?$/.test(rawVal) && !["includes", "not_includes", "starts_with", "ends_with"].includes(op);
	filters.push(leaf(key, op, numeric ? Number(rawVal) : rawVal, numeric ? "number" : "string"));
}
for (const key of opts.exists)
	filters.push({ kind: "filter", key, operation: "exists", type: "string" });

// ── request ────────────────────────────────────────────────────────────────
async function call(path, body) {
	const res = await fetch(`${API}/${path}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	const json = await res.json().catch(() => null);
	if (!res.ok || !json?.success) {
		const err = JSON.stringify(json?.errors ?? res.status);
		if (res.status === 401 || res.status === 403 || /10000|9109/.test(err))
			fail(
				`Auth rejected (${err}).\nThe token in ${TOKEN_FILE} (or $CLOUDFLARE_LOGS_API_TOKEN) must be an API token with\nAccount -> Workers Observability -> Read on account ${ACCOUNT_ID}.`,
			);
		fail(`API error: ${err}`);
	}
	return json.result;
}

function needleParam() {
	return opts.search
		? { value: opts.search, isRegex: opts.regex, matchCase: false }
		: undefined;
}

function queryBody(view) {
	return {
		queryId: "agent-cloudlogs",
		dry: true,
		view,
		limit: opts.limit,
		...(opts.cursor ? { offset: opts.cursor, offsetDirection: "next" } : {}),
		timeframe: { from, to },
		parameters: {
			datasets: ["cloudflare-workers"],
			filters,
			...(needleParam() ? { needle: needleParam() } : {}),
			limit: opts.limit,
			...(view === "calculations"
				? {
						calculations: [{ operator: "count", alias: "count" }],
						groupBys: [{ type: "string", value: opts.groupBy }],
						orderBy: { value: "count", order: "desc" },
					}
				: {}),
		},
	};
}

// ── rendering ──────────────────────────────────────────────────────────────
const trunc = (s, n) =>
	!opts.full && s.length > n ? `${s.slice(0, n)} …[truncated]` : s;

function renderEvent(e) {
	const m = e.$metadata ?? {};
	const w = e.$workers ?? {};
	const ts = new Date(e.timestamp).toISOString();
	const bits = [ts, m.level ?? "-"];
	if (w.outcome && w.outcome !== "ok") bits.push(`outcome=${w.outcome}`);
	if (m.trigger) bits.push(`[${m.trigger}]`);
	const msg = m.message ?? m.error ?? "";
	let line = `${bits.join(" ")} ${msg}`;
	// Skip the raw payload when it merely echoes the extracted message.
	const echoes =
		typeof e.source === "object" &&
		e.source !== null &&
		e.source.message === m.message &&
		Object.keys(e.source).every((k) => ["level", "message", "timestamp"].includes(k));
	const src =
		typeof e.source === "string" ? e.source : JSON.stringify(e.source ?? "");
	if (src && src !== msg && src !== "{}" && !echoes)
		line += `  src=${trunc(src, 400)}`;
	if (w.requestId) line += `  req=${w.requestId}`;
	return line;
}

// ── commands ───────────────────────────────────────────────────────────────
const windowNote = `${new Date(from).toISOString()} .. ${new Date(to).toISOString()} (${opts.service ?? "all services"})`;

if (command === "events" || command === "invocations") {
	const view = command;
	const result = await call("query", queryBody(view));
	if (opts.json) {
		console.log(JSON.stringify(result, null, 2));
		process.exit(0);
	}
	if (view === "events") {
		const ev = result.events?.events ?? [];
		for (const e of ev) console.log(renderEvent(e));
		const total = result.events?.count ?? ev.length;
		console.log(`-- ${ev.length}/${total} events, ${windowNote}`);
		if (total > ev.length && ev.length)
			console.log(
				`-- more: rerun with --cursor '${ev[ev.length - 1].$metadata?.id}'`,
			);
	} else {
		const inv = result.invocations ?? {};
		const ids = Object.keys(inv);
		for (const id of ids) {
			console.log(`== invocation ${id}`);
			for (const e of inv[id]) console.log(`  ${renderEvent(e)}`);
		}
		console.log(`-- ${ids.length} invocations, ${windowNote}`);
	}
} else if (command === "count") {
	const result = await call("query", queryBody("calculations"));
	if (opts.json) {
		console.log(JSON.stringify(result, null, 2));
		process.exit(0);
	}
	const calc = result.calculations?.[0];
	const rows = calc?.aggregates ?? [];
	for (const r of rows) {
		const label =
			r.groups?.map((g) => g.value).join(" | ") ?? r.key ?? "(all)";
		console.log(`${String(r.value ?? r.count).padStart(8)}  ${label}`);
	}
	if (!rows.length) console.log("(no rows — check --json for raw shape)");
	console.log(`-- count by ${opts.groupBy}, ${windowNote}`);
} else if (command === "keys") {
	const result = await call("keys", {
		datasets: ["cloudflare-workers"],
		filters,
		from,
		to,
		limit: 1000,
	});
	for (const k of result ?? []) console.log(`${k.type ?? "?"}\t${k.key ?? k.name}`);
} else if (command === "values") {
	const key = positional.shift();
	if (!key) fail("usage: values <key>");
	const result = await call("values", {
		datasets: ["cloudflare-workers"],
		key,
		type: "string",
		filters,
		timeframe: { from, to },
		limit: 100,
	});
	for (const v of result ?? []) console.log(v.value ?? JSON.stringify(v));
}
