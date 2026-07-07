#!/usr/bin/env node
// Validates the specs/ layer: every relative .md link resolves, and every
// spec file is registered in specs/INDEX.md. Templates are exempt.
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

if (failures) {
  console.error(`\n${failures} problem(s).`);
  process.exit(1);
}
console.log(`spec layer OK: ${files.length} files, all links resolve, all registered.`);
