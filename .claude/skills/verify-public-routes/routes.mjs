#!/usr/bin/env node
import { createHash } from "node:crypto";

// Assert the HTTP contract of the product's public surface, the way a browser,
// a QR scanner, or Vipps' website verification sees it. See SKILL.md.
//
// Deliberately plain `fetch` + no deps: it must run in a fresh worktree before
// `pnpm install`, and it must not go through anything that could mask a real
// response (redirects are NEVER auto-followed — the Location header IS the
// contract for the legacy /org/* paths).

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help") {
  console.log(`usage: node routes.mjs <url> [assertions...]

assertions:
  --status <n>          response status must equal n
  --redirect <url>      status must be 3xx AND Location must equal url exactly
  --header <k=v>        response header k must equal v (case-insensitive name)
  --contains <text>     response body must contain text
  --not-contains <text> response body must NOT contain text
  --repeat <n>          request n times; assertions apply to the LAST response,
                        and every response's status, x-sm-cache, ms and body
                        digest is printed (this is how you prove the
                        stale-while-revalidate cache goes miss -> hit, and how
                        you prove a COMPUTED response is being reused: an
                        expensive first ms, cheap ones after, one digest)
  --quiet               print only failures

exit 0 = every assertion held; non-zero = first failure is printed.`);
  process.exit(args.length === 0 ? 1 : 0);
}

// A scheme-less `localhost:4322/path` is what anyone actually types (and what
// this skill's own examples showed), but `fetch` reads "localhost:" as the
// PROTOCOL and dies — with an error that reads exactly like a dead server.
// Normalize it here so the obvious invocation works.
const rawUrl = args[0];
const url = /^https?:\/\//.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
const opts = { headers: [], contains: [], notContains: [], repeat: 1 };
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  const next = () => {
    const v = args[++i];
    if (v === undefined) {
      console.error(`FAIL  ${a} needs a value`);
      process.exit(2);
    }
    return v;
  };
  if (a === "--status") opts.status = Number(next());
  else if (a === "--redirect") opts.redirect = next();
  else if (a === "--header") opts.headers.push(next());
  else if (a === "--contains") opts.contains.push(next());
  else if (a === "--not-contains") opts.notContains.push(next());
  else if (a === "--repeat") opts.repeat = Number(next());
  else if (a === "--quiet") opts.quiet = true;
  else {
    console.error(`FAIL  unknown argument ${a}`);
    process.exit(2);
  }
}

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

let response;
let body = "";
for (let attempt = 1; attempt <= opts.repeat; attempt++) {
  const started = performance.now();
  try {
    // `redirect: manual` is the whole point for the legacy-path checks.
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    console.error(`FAIL  ${url}: request failed — ${error.message}`);
    console.error("      (dev server down? note `git stash` can kill it — see project-overview)");
    console.error(`      (reached for: ${url} — pass host:port or a full http(s) URL)`);
    process.exit(1);
  }
  // Bytes, not text(): an image or a PDF has to survive this intact for its
  // digest to mean anything, and the text form is derived from the same read.
  const bytes = new Uint8Array(await response.arrayBuffer());
  body = new TextDecoder().decode(bytes);
  if (opts.repeat > 1 && !opts.quiet) {
    const cache = response.headers.get("x-sm-cache") ?? "-";
    // ms and digest are what expose a cache with no header of its own — a
    // stored rendering, an R2-backed image. Same digest + a collapse in ms
    // means it was reused; same digest + the same ms means it was recomputed.
    const ms = Math.round(performance.now() - started);
    const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    console.log(
      `  #${attempt}  ${response.status}  x-sm-cache=${cache}  ${ms}ms  ` +
        `${bytes.length}B  ${digest}`,
    );
  }
}

if (opts.status !== undefined) {
  check(response.status === opts.status, `status ${response.status}, expected ${opts.status}`);
}

if (opts.redirect !== undefined) {
  const location = response.headers.get("location");
  check(
    response.status >= 300 && response.status < 400,
    `status ${response.status} is not a redirect`,
  );
  check(location === opts.redirect, `Location ${location}, expected ${opts.redirect}`);
}

for (const pair of opts.headers) {
  const eq = pair.indexOf("=");
  if (eq === -1) {
    console.error(`FAIL  --header needs k=v, got ${pair}`);
    process.exit(2);
  }
  const name = pair.slice(0, eq);
  const expected = pair.slice(eq + 1);
  const actual = response.headers.get(name);
  check(actual === expected, `header ${name} is ${actual}, expected ${expected}`);
}

for (const text of opts.contains) {
  check(body.includes(text), `body does not contain ${JSON.stringify(text)}`);
}
for (const text of opts.notContains) {
  check(!body.includes(text), `body unexpectedly contains ${JSON.stringify(text)}`);
}

if (failures.length > 0) {
  console.error(`FAIL  ${url}`);
  for (const failure of failures) console.error(`      ${failure}`);
  process.exit(1);
}
if (!opts.quiet) console.log(`OK    ${url}  (${response.status})`);
