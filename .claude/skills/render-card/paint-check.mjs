#!/usr/bin/env node
/**
 * Does the card still have its WORDS the first time a browser paints it?
 *
 * A card is handed to people as an `<img>` (the receipt page, min-side, the
 * member's own page, a club's website hot-linking the QR card). An `<img>` is
 * a picture: the browser paints it once, and whatever is on it at that moment
 * is what the person gets. Nothing promises a second paint.
 *
 * That makes the typeface a race. The face rides inside the file as a data
 * URI, and a browser resolving a face draws the text INVISIBLY while it waits
 * (`font-display` defaults to `block`). Lose the race and the member is handed
 * a logo, a heart, a QR code and not one readable word
 * (specs/concepts/member-card.md, specs/concepts/brand-palette.md). That is
 * what a member got on their receipt on 2026-09-10.
 *
 * `render.mjs`'s "as served" column cannot catch it: it screenshots one
 * headless Chrome with all the time in the world, on a warm font cache, and
 * the race is always won. This loses it on purpose (cold cache, throttled
 * network, slowed CPU, a second engine) and asserts the one property that
 * matters for a picture drawn once:
 *
 *     THE FIRST PAINT MUST ALREADY BE THE SETTLED PAINT.
 *
 * Anything that arrives later than the first paint is something a reader can
 * be left without forever.
 *
 *   node paint-check.mjs <svg-file-or-url> [flags]
 *
 * See SKILL.md. Exits 0 when every engine passed, 1 on the first that did not.
 */
import { glob, mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

/**
 * Playwright is not a workspace dependency; `preview-screenshot` reaches it
 * through `npx -y playwright`, which leaves the package in npm's _npx cache
 * under a content hash. Same lookup `drive-page/drive.mjs` uses: keep the two
 * in step.
 */
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    /* not a workspace dep, expected */
  }
  const pattern = path.join(os.homedir(), ".npm/_npx/*/node_modules/playwright/index.mjs");
  for await (const entry of glob(pattern)) {
    return await import(`file://${entry}`);
  }
  console.error(
    "playwright not found. Populate npm's npx cache once with:\n  npx -y playwright --version",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) {
  console.log(`node paint-check.mjs <svg-file-or-url> [flags]

  --engine chromium|webkit|both   default both (webkit needs: npx -y playwright install webkit)
  --width N        CSS width to show the card at (default 384, what the pages cap at)
  --net N          download throttle in kB/s, 0 = off (default 60, chromium only)
  --cpu N          CPU slowdown factor (default 6, chromium only)
  --at a,b,c       sample times in ms (default 400,1200,3000,8000,20000)
  --out DIR        keep the sample PNGs here (default a temp dir, printed on failure)`);
  process.exit(0);
}

const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1];
};
const source = args[0];
const engines = flag("engine", "both");
const cssWidth = Number(flag("width", 384));
const netKbs = Number(flag("net", 60));
const cpuRate = Number(flag("cpu", 6));
const sampleAt = String(flag("at", "400,1200,3000,8000,20000"))
  .split(",")
  .map(Number)
  .sort((a, b) => a - b);
const outDir = flag("out", path.join(os.tmpdir(), `paint-check-${Date.now()}`));

/**
 * The card is served over real HTTP even when it came from a file: the whole
 * point is a cold fetch a throttle can slow down. `no-store` so a second
 * engine cannot inherit the first one's warm cache.
 */
async function serve(svg) {
  const page = `<!doctype html><meta charset=utf-8>
<style>html,body{margin:0;background:#fff}img{display:block;width:${cssWidth}px;height:auto}</style>
<img src="/card.svg" alt="">`;
  const server = http.createServer((req, res) => {
    const svgRequest = req.url.startsWith("/card.svg");
    res.writeHead(200, {
      "Content-Type": svgRequest ? "image/svg+xml; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(svgRequest ? svg : page);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  return { server, port: server.address().port };
}

/**
 * A screenshot's PNG byte length is the ink measure here: a band of blank
 * paper compresses to a few hundred bytes, the same band with words on it to
 * thousands. No image decoding, and no guessing where the words are: the
 * comparison is each sample against the settled one, byte for byte.
 */
async function run(engine, port, launcher) {
  // The installed Chrome, the way `preview-screenshot` reaches it, so a
  // checkout does not have to download a second browser to run this.
  const browser = await launcher.launch(engine === "chromium" ? { channel: "chrome" } : {});
  const context = await browser.newContext({
    viewport: { width: Math.max(cssWidth + 40, 420), height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Chromium is the only engine whose throttling is reachable over CDP;
  // webkit runs at full speed and is here for the second rasterizer, not the
  // second stopwatch.
  if (engine === "chromium") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    if (netKbs > 0) {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 300,
        downloadThroughput: netKbs * 1024,
        uploadThroughput: netKbs * 1024,
      });
    }
    if (cpuRate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
  }

  page.goto(`http://localhost:${port}/`).catch(() => {});

  const samples = [];
  let waited = 0;
  for (const at of sampleAt) {
    await page.waitForTimeout(at - waited);
    waited = at;
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: cssWidth, height: 880 } });
    const file = path.join(outDir, `${engine}-${at}ms.png`);
    await writeFile(file, png);
    samples.push({ at, bytes: png.length, png, file });
  }
  await browser.close();
  return samples;
}

function verdict(engine, samples) {
  const settled = samples.at(-1);
  // A sample with nothing on it at all is the card still in flight, not a card
  // without words. Blank paper at this size lands around a kilobyte; the
  // threshold only has to separate "no picture" from "a picture".
  const blank = Math.max(2000, settled.bytes * 0.15);
  const painted = samples.find((sample) => sample.bytes > blank);

  console.log(`\n${engine}:`);
  for (const sample of samples) {
    const mark =
      sample.bytes <= blank
        ? "not painted yet"
        : sample.png.equals(settled.png)
          ? "settled"
          : "DIFFERS from settled";
    console.log(
      `  ${String(sample.at).padStart(6)}ms  ${String(sample.bytes).padStart(7)} B  ${mark}`,
    );
  }

  if (!painted) {
    console.log(`  FAIL: the card never painted at all within ${settled.at}ms.`);
    return false;
  }
  if (!painted.png.equals(settled.png)) {
    console.log(
      `  FAIL: first paint (${painted.at}ms) is not the settled paint. A picture is drawn once,\n` +
        `        so a reader can be left with the first one forever. Compare:\n` +
        `          ${painted.file}\n          ${settled.file}`,
    );
    return false;
  }
  console.log(`  PASS: first paint (${painted.at}ms) is already the settled card.`);
  return true;
}

const svg = /^https?:\/\//.test(source)
  ? Buffer.from(await (await fetch(source)).arrayBuffer())
  : await readFile(source);
await mkdir(outDir, { recursive: true });
const { server, port } = await serve(svg);
const playwright = await loadPlaywright();

let ok = true;
for (const engine of engines === "both" ? ["chromium", "webkit"] : [engines]) {
  try {
    ok = verdict(engine, await run(engine, port, playwright[engine])) && ok;
  } catch (error) {
    // A missing engine binary is a gap in the checkout, not a verdict on the
    // card. Say which, and do not pretend the card passed in that engine.
    console.log(`\n${engine}:\n  SKIPPED: ${error.message.split("\n")[0]}`);
    console.log(`  install it once with: npx -y playwright install ${engine}`);
    ok = false;
  }
}
server.close();
console.log(`\nsamples: ${outDir}`);
process.exit(ok ? 0 : 1);
