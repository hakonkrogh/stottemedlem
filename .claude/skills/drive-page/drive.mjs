#!/usr/bin/env node
/**
 * Drive a page in a real Chrome the way a visitor does: click, fill, read,
 * assert — and stub the browser APIs a headless run does not have.
 *
 * A screenshot proves a page LOOKS right; this proves it BEHAVES right. Every
 * interactive bit of this product (the card's share action, the join form, the
 * member-list filter pills, the "si opp" POST) is invisible to typecheck,
 * vitest and preview-screenshot alike.
 *
 *   node drive.mjs <url> [flags] <step>...
 *
 * Steps are one argv token each, `verb=arg` or `verb=arg::arg2`. See SKILL.md.
 */
import { glob } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Playwright is not a workspace dependency — `preview-screenshot` reaches it
 * through `npx -y playwright`, which leaves the package in npm's _npx cache
 * under a content hash. Importing it means finding that hash, so try the
 * ordinary resolution first and fall back to the cache.
 */
async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    /* not a workspace dep — expected */
  }
  const pattern = path.join(os.homedir(), ".npm/_npx/*/node_modules/playwright/index.mjs");
  for await (const entry of glob(pattern)) {
    return (await import(`file://${entry}`)).chromium;
  }
  console.error(
    "playwright not found. Populate npm's npx cache once with:\n  npx -y playwright --version",
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes("--help")) {
  console.error(`usage: node drive.mjs <url> [flags] <step>...

flags:
  --viewport WxH     default 1440x900
  --mobile           shorthand for 390x844
  --permissions a,b  e.g. clipboard-read,clipboard-write
  --stub '<js>'      run this before every page load (repeatable) — fake or
                     remove a browser API, seed storage, record calls
  --console          print console messages and page errors
  --keep-going       do not stop at the first failed assert

steps (one argv token each):
  goto=<url>            click=<sel>           fill=<sel>::<text>
  press=<sel>::<key>    wait=<sel>            sleep=<ms>
  read=<sel>            attr=<sel>::<name>    count=<sel>
  assert=<sel>::<text>  eval=<js>             shot=<path>
  url=`);
  process.exit(2);
}

let viewport = { width: 1440, height: 900 };
let permissions = [];
const stubs = [];
let showConsole = false;
let keepGoing = false;
const steps = [];
let url = null;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--mobile") viewport = { width: 390, height: 844 };
  else if (arg === "--viewport") {
    const [w, h] = argv[++i].split("x");
    viewport = { width: Number(w), height: Number(h) };
  } else if (arg === "--permissions") permissions = argv[++i].split(",").filter(Boolean);
  else if (arg === "--stub") stubs.push(argv[++i]);
  else if (arg === "--console") showConsole = true;
  else if (arg === "--keep-going") keepGoing = true;
  // The first non-flag argument is the URL — decided by position, not by
  // looking for an "=", because every interesting URL here carries a query
  // string (`?n=<token>`) and would otherwise be parsed as a step.
  else if (!url) url = arg;
  else steps.push(arg);
}

if (!url) {
  console.error("no url given");
  process.exit(2);
}

const chromium = await loadChromium();
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport, permissions });
for (const stub of stubs) await context.addInitScript({ content: stub });

const page = await context.newPage();
if (showConsole) {
  page.on("console", (message) => console.log(`console.${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.log(`pageerror: ${error.message}`));
}

let failures = 0;

/** `verb=arg::arg2` → ["verb", "arg", "arg2"]. */
function parse(step) {
  const at = step.indexOf("=");
  const verb = step.slice(0, at);
  const rest = step.slice(at + 1);
  const [first, ...more] = rest.split("::");
  return [verb, first, more.join("::")];
}

async function text(selector) {
  return ((await page.textContent(selector)) ?? "").trim();
}

await page.goto(url);

for (const step of steps) {
  const [verb, a, b] = parse(step);
  try {
    switch (verb) {
      case "goto":
        await page.goto(a);
        break;
      case "click":
        await page.click(a);
        break;
      case "fill":
        await page.fill(a, b);
        break;
      case "press":
        await page.press(a, b);
        break;
      case "wait":
        await page.waitForSelector(a);
        break;
      case "sleep":
        await page.waitForTimeout(Number(a));
        break;
      case "read":
        console.log(`${a}: ${await text(a)}`);
        break;
      case "attr":
        console.log(`${a}[${b}]: ${await page.getAttribute(a, b)}`);
        break;
      case "count":
        console.log(`${a}: ${(await page.$$(a)).length}`);
        break;
      case "assert": {
        const actual = await text(a);
        const ok = actual.includes(b);
        console.log(
          `${ok ? "PASS" : "FAIL"} ${a} contains "${b}"${ok ? "" : ` — got "${actual}"`}`,
        );
        if (!ok) failures++;
        break;
      }
      case "eval":
        console.log(JSON.stringify(await page.evaluate(a)));
        break;
      case "shot":
        await page.screenshot({ path: a, fullPage: true });
        console.log(a);
        break;
      case "url":
        console.log(page.url());
        break;
      default:
        console.error(`unknown step: ${verb}`);
        failures++;
    }
  } catch (error) {
    console.log(`ERROR ${step} — ${error.message}`);
    failures++;
  }
  if (failures > 0 && !keepGoing) break;
}

await browser.close();
process.exit(failures > 0 ? 1 : 0);
