#!/usr/bin/env node
// Validates the specs/ layer: every relative .md link resolves, every spec
// file is registered in specs/INDEX.md, and every `specs/…md` path cited from
// OUTSIDE specs/ still exists. Templates are exempt.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "specs");
const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
};
walk(root);

let failures = 0;
const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  failures++;
};

const isTemplate = (p) => p.includes("_TEMPLATE");

for (const f of files) {
  if (isTemplate(f)) continue;
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/\]\(([^)#\s]+\.md)\)/g)) {
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) fail(`${f}: broken link -> ${m[1]}`);
  }
}

const index = readFileSync(join(root, "INDEX.md"), "utf8");
for (const f of files) {
  if (isTemplate(f) || f.endsWith("INDEX.md") || f.endsWith("process.md")) continue;
  const rel = f.slice(root.length + 1);
  if (!index.includes(`(${rel})`)) fail(`${rel}: not registered in INDEX.md`);
}

// The citations OUTSIDE specs/. Code comments, skills and docs point at spec
// files by repo-relative path ("specs/concepts/membership.md"), which is how a
// reader gets from a screen to the intent behind it. Renaming a spec leaves
// every one of those dangling, and nothing else in the repo looks: the links
// checked above are the ones INSIDE specs/, biome does not read prose, and a
// stale path in a comment compiles perfectly. Cost a 10-file grep on
// 2026-09-10 renaming a use case that was one day old.
let cited = 0;
try {
  const tracked = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
    .split("\n")
    .filter(
      (p) => p && !p.startsWith("specs/") && /\.(ts|tsx|mjs|js|astro|md|json|sh|yml|yaml)$/.test(p),
    );
  for (const file of tracked) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of text.matchAll(/\bspecs\/[A-Za-z0-9._\-/]+\.md/g)) {
      cited++;
      // `specs/**/x.md` and the like are patterns in config, not citations.
      if (m[0].includes("*")) continue;
      if (!existsSync(resolve(m[0]))) fail(`${file}: cites a spec that does not exist -> ${m[0]}`);
    }
  }
} catch (error) {
  console.error(`(skipped the outside-specs citation check: ${error.message})`);
}

if (failures) {
  console.error(`\n${failures} problem(s).`);
  process.exit(1);
}
console.log(
  `spec layer OK: ${files.length} files, all links resolve, all registered, ` +
    `${cited} citation(s) from outside specs/ resolve.`,
);
