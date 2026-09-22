#!/usr/bin/env node
/**
 * Print any URL to a PDF the way the browser's own print dialog would:
 * print media, the page's own @page size, backgrounds on. Then say how many
 * pages came out, because that is the number a print layout is judged on (a
 * blank trailing page, or two cards floating on a page of their own, is a
 * layout bug no screenshot shows).
 *
 *   node .claude/skills/preview-screenshot/print.mjs <url> <out.pdf> [--wait ms]
 *
 * Read the PDF afterwards with the Read tool (it renders pages as images).
 */
import { glob } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    /* not a workspace dep, expected */
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

const args = process.argv.slice(2);
const waitAt = args.indexOf("--wait");
const wait = waitAt >= 0 ? Number(args[waitAt + 1]) : 7000;
const [url, out] = args.filter((_, i) => waitAt < 0 || (i !== waitAt && i !== waitAt + 1));
if (!url || !out) {
  console.error("usage: print.mjs <url> <out.pdf> [--wait ms]");
  process.exit(1);
}

const chromium = await loadChromium();
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.goto(url);
  // Storybook stories and webfonts both arrive late; give them the same time
  // the screenshot loop does.
  await page.waitForTimeout(wait);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`${out}: ${pages} page(s), ${pdf.length} bytes`);
} finally {
  await browser.close();
}
