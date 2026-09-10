#!/usr/bin/env node
// Read WorkOS, the authority on who may act for an organization
// (specs/concepts/administrator.md). READ-ONLY on purpose: see SKILL.md.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API = "https://api.workos.com";

const KEY_FILE = join(homedir(), ".config", "stottemedlem", "workos-api-key");
const DEV_VARS = join(process.cwd(), "apps", "backoffice", ".dev.vars");

const SETUP = `No WorkOS API key found. Any ONE of these:

  1. WORKOS_API_KEY=sk_... node .claude/skills/workos-context/workos.mjs ...
  2. save the key (one line) to ~/.config/stottemedlem/workos-api-key
     (user-global, so every worktree and agent shares it)
  3. fill WORKOS_API_KEY in apps/backoffice/.dev.vars (repo-local, gitignored)

The key is the user's to give: dashboard.workos.com -> API Keys, for the
ENVIRONMENT you mean (a staging key cannot see production's people).`;

// `.dev.vars.example` ships `WORKOS_API_KEY="sk_test_..."`, which a fresh
// worktree copies verbatim. Taking it would turn "nobody filled this in" into a
// bare 401, so a placeholder counts as no key at all.
const isRealKey = (value) => value.startsWith("sk_") && !value.includes("...");

function readKey() {
  const fromEnv = process.env.WORKOS_API_KEY ?? "";
  if (isRealKey(fromEnv)) return { key: fromEnv, source: "the WORKOS_API_KEY env var" };
  for (const file of [KEY_FILE, DEV_VARS]) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const fromVars = text.match(/^\s*WORKOS_API_KEY\s*=\s*"?(sk_[^"\s]+)"?/m);
    if (fromVars && isRealKey(fromVars[1])) return { key: fromVars[1], source: file };
    const bare = text.trim();
    if (!bare.includes("\n") && isRealKey(bare)) return { key: bare, source: file };
  }
  console.error(SETUP);
  process.exit(2);
}

const { key, source: keySource } = readKey();

async function get(path, params = {}) {
  const url = new URL(path, API);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, value);
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const body = await response.text();
  if (!response.ok) {
    console.error(`WorkOS ${response.status} on ${url.pathname}: ${body.slice(0, 400)}`);
    if (response.status === 401) {
      console.error(`\nThe key came from ${keySource} and WorkOS rejected it.\n\n${SETUP}`);
    }
    if (response.status === 404) {
      console.error(
        `\nThe key came from ${keySource}. A 404 here can also mean the id belongs to a` +
          " DIFFERENT WorkOS environment than that key.",
      );
    }
    process.exit(1);
  }
  return JSON.parse(body);
}

/** Everything after the command, as --flag=value plus positionals. */
function parseArgs(argv) {
  const flags = {};
  const rest = [];
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) flags[match[1]] = match[2] ?? "1";
    else rest.push(arg);
  }
  return { flags, rest };
}

const LIMIT = 100;

/** An organization by id, or by a case-insensitive part of its name. */
async function findOrg(needle) {
  if (!needle) return null;
  if (needle.startsWith("org_")) return await get(`/organizations/${needle}`);
  const { data } = await get("/organizations", { limit: LIMIT });
  const lower = needle.toLowerCase();
  return data.find((org) => org.name.toLowerCase().includes(lower)) ?? null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const COMMANDS = {
  /** Every organization in this environment: id, name, when it was created. */
  async orgs() {
    const { data } = await get("/organizations", { limit: LIMIT });
    for (const org of data) console.log(`${org.id}\t${org.created_at.slice(0, 10)}\t${org.name}`);
    console.log(`\n${data.length} organization(s)`);
  },

  /** Who may act for one organization, memberships joined to their user records. */
  async admins(rest) {
    const org = await findOrg(rest[0]);
    if (!org) fail("Usage: admins <org_id | part of the name>");
    const [memberships, users] = await Promise.all([
      get("/user_management/organization_memberships", {
        organization_id: org.id,
        limit: LIMIT,
      }),
      get("/user_management/users", { organization_id: org.id, limit: LIMIT }),
    ]);
    const byId = new Map(users.data.map((user) => [user.id, user]));
    console.log(`${org.name} (${org.id})`);
    for (const m of memberships.data) {
      const user = byId.get(m.user_id);
      const name = user?.first_name
        ? `${user.first_name} ${user.last_name ?? ""}`.trim()
        : (user?.email ?? "(user not listed)");
      console.log(`  ${m.status}\t${user?.email ?? "?"}\t${name}\t${m.user_id}`);
    }
    console.log(`  ${memberships.data.length} membership(s)`);
  },

  /** Invitations for one organization. Every state unless --state= narrows it. */
  async invites(rest, flags) {
    const org = await findOrg(rest[0]);
    if (!org) fail("Usage: invites <org_id | part of the name> [--state=pending]");
    const { data } = await get("/user_management/invitations", {
      organization_id: org.id,
      limit: LIMIT,
    });
    const shown = flags.state ? data.filter((i) => i.state === flags.state) : data;
    console.log(`${org.name} (${org.id})`);
    for (const i of shown) {
      console.log(
        `  ${i.state}\t${i.email}\tsent ${i.created_at.slice(0, 10)}\texpires ${i.expires_at.slice(0, 10)}\t${i.id}`,
      );
    }
    console.log(`  ${shown.length} invitation(s)${flags.state ? ` in state ${flags.state}` : ""}`);
  },

  /** One person by email or user id, with every organization they belong to. */
  async user(rest) {
    const needle = rest[0];
    if (!needle) fail("Usage: user <email | user_id>");
    const found = needle.startsWith("user_")
      ? await get(`/user_management/users/${needle}`)
      : (await get("/user_management/users", { email: needle, limit: 1 })).data[0];
    if (!found) fail(`No user matches ${needle}`);
    console.log(`${found.id}\t${found.email}\t${found.first_name ?? ""} ${found.last_name ?? ""}`);
    console.log(
      `  verified=${found.email_verified} last sign-in=${found.last_sign_in_at ?? "never"}`,
    );
    const { data } = await get("/user_management/organization_memberships", {
      user_id: found.id,
      limit: LIMIT,
    });
    for (const m of data) console.log(`  ${m.status}\t${m.organization_id}`);
    console.log(`  ${data.length} membership(s)`);
  },

  /** Anything else the REST API answers, for a path this CLI has no verb for. */
  async raw(rest, flags) {
    const path = rest[0];
    if (!path) fail('Usage: raw "/user_management/invitations?organization_id=org_..." ');
    const [pathname, query = ""] = path.split("?");
    const params = Object.fromEntries(new URLSearchParams(query));
    console.log(JSON.stringify(await get(pathname, params), null, flags.compact ? 0 : 2));
  },
};

const [command = "orgs", ...argv] = process.argv.slice(2);
const run = COMMANDS[command];
if (!run) {
  console.error(`Unknown command "${command}". One of: ${Object.keys(COMMANDS).join(", ")}`);
  process.exit(1);
}
const { flags, rest } = parseArgs(argv);
await run(rest, flags);
