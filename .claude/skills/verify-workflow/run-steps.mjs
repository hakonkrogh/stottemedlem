#!/usr/bin/env node
// Run a GitHub Actions workflow job's `run:` steps locally, in an environment
// scrubbed the way a fresh runner is — so a step that silently leans on a local
// secret, a stale generated file, or a warm cache fails HERE instead of on CI.
//
// Usage:  node run-steps.mjs <workflow.yml> [job] [--list] [--keep-env] [--force-turbo]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

// js-yaml is a transitive dep here, not a direct one: pnpm leaves it hoisted in
// .pnpm/node_modules rather than resolvable from the repo root.
function loadYaml() {
  const req = createRequire(`${REPO}/package.json`);
  for (const id of ["js-yaml", `${REPO}/node_modules/.pnpm/node_modules/js-yaml`]) {
    try {
      return req(id);
    } catch {}
  }
  console.error("Cannot resolve js-yaml. Run `pnpm install` at the repo root first.");
  process.exit(2);
}

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const [file, jobName] = argv.filter((a) => !a.startsWith("--"));
if (!file) {
  console.error(
    "usage: node run-steps.mjs <workflow.yml> [job] [--list] [--keep-env] [--force-turbo]",
  );
  process.exit(2);
}

const wf = loadYaml().load(readFileSync(resolve(REPO, file), "utf8"));
const jobs = wf.jobs ?? {};
const name = jobName ?? Object.keys(jobs)[0];
const job = jobs[name];
if (!job) {
  console.error(`No job "${name}". Jobs: ${Object.keys(jobs).join(", ")}`);
  process.exit(2);
}

// A scrubbed env is the whole point: `env -i`-style, plus what the runner sets.
// --keep-env opts out when a step legitimately needs your shell (rare).
const base = flags.has("--keep-env")
  ? { ...process.env }
  : { PATH: process.env.PATH, HOME: process.env.HOME, LANG: "en_US.UTF-8" };
const env = { ...base, CI: "true", GITHUB_ACTIONS: "true", ...(wf.env ?? {}), ...(job.env ?? {}) };
for (const k of Object.keys(env))
  if (env[k] == null) delete env[k];
  else env[k] = String(env[k]);

const steps = job.steps ?? [];
let n = 0;
for (const step of steps) {
  const label = step.name ?? step.uses ?? step.run?.split("\n")[0] ?? "(unnamed)";
  if (!step.run) {
    console.log(`\x1b[90m— skip  ${label}\x1b[0m  (a \`uses:\` action — not reproducible locally)`);
    continue;
  }
  // Interpolations (secrets, github.*) can't be resolved off-runner; a step that
  // needs one is out of scope for this tool rather than silently run with "".
  // This MUST also cover the step's `env:` — a deploy step is a plain
  // `wrangler deploy` whose credentials arrive only through env, so checking
  // `run:` alone would happily fire a real deploy or a real --remote D1
  // migration against production.
  const scan = [step.run, ...Object.values(step.env ?? {}), ...Object.values(job.env ?? {})].join(
    "\n",
  );
  const expr = scan.match(/\$\{\{[^}]+\}\}/);
  if (expr) {
    console.log(`\x1b[33m— skip  ${label}\x1b[0m  (needs runner expression ${expr[0]})`);
    continue;
  }
  let cmd = step.run;
  if (flags.has("--force-turbo")) {
    // Turbo replays cached output across worktrees, so an unforced task can
    // print green without executing. See project-overview.
    cmd = cmd.replace(/(pnpm\s+turbo\s+run\s+[^\n|&;]*?)(\s*)$/gm, "$1 --force$2");
  }
  n++;
  console.log(`\n\x1b[1m▶ ${label}\x1b[0m\n  $ ${cmd.trim().replace(/\n/g, "\n  ")}`);
  if (flags.has("--list")) continue;
  const r = spawnSync("bash", ["-eo", "pipefail", "-c", cmd], {
    cwd: REPO,
    env: { ...env, ...(step.env ?? {}) },
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`\n\x1b[31m✗ step failed: ${label} (exit ${r.status})\x1b[0m`);
    process.exit(r.status ?? 1);
  }
}
console.log(
  flags.has("--list")
    ? `\n${n} runnable step(s) in job "${name}".`
    : `\n\x1b[32m✓ all ${n} run-step(s) of job "${name}" passed in a scrubbed env\x1b[0m`,
);
