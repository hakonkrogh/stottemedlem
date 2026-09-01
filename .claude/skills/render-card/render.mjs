#!/usr/bin/env node
/**
 * Render the project's card artwork straight from `@stottemedlem/qr`, with no
 * dev server, no D1 and no auth — then optionally rasterize it through the
 * SAME resvg + embedded-Fraunces path the Worker ships.
 *
 * See SKILL.md for why the raster pass is the one that matters: resvg applies
 * no variable font axes, so it draws every line at Fraunces' heavy default
 * instance — wider and bolder than a browser. A card that fits in Storybook
 * can still overrun the shared PNG.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const QR_DIST = resolve(ROOT, "packages/qr/dist/index.js");
const FONT = resolve(ROOT, "apps/backoffice/src/assets/fonts/Fraunces.ttf");

/**
 * Fictitious throughout — a rendered card may end up in a screenshot or a doc,
 * and committed artwork must never carry a real organization's data.
 *
 * A 64x64 PNG stand-in for an organization's mark. The logo has to be a data
 * URI: the card is one self-contained file, so it cannot link out to R2.
 */
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABCUlEQVR42u2asRXDIAxEb4y0qbP/HlkjE6T1BoAFkk5nvUdt/w8FSDr8f9/SC2c/93m/potOYAXaTwZZ6Kc0kIu+rwEG9B0N8KDbNEBIf8sBnPTrDqClX3QAM/2KA8jppw7gpx87oAT9wAEe9H6n6isQcCfOBSKfMUf+tSsQ/xofCcTT7//XLhBfyk0EEul3ACwCfhW6XSB9+80Y4Nl+G8nDBGJ6VbcFeLbfcAhPEojseLZAC7RAC7QAn0DfxG4C5R9zXQ+UEiAtKcsX9QptlfKNLYXWYvnmrkJ7vfyAQ2HEVH7IpzBmVRh0K0QNFMIeCnEbhcCTQuRMIfQnErsUCb6KRI9Fwt+56wKF4QaIff1TIAAAAABJRU5ErkJggg==";

const JOIN_URL = "https://xn--stttemedlem-hgb.no/bli-medlem/eksempel-musikkorps?verva=kort-1";

const MEMBER_BASE = {
  memberName: "Kari Eksempel",
  organizationName: "Eksempel Musikkorps",
  hearts: 4,
  periodText: "2026",
  joinUrl: JOIN_URL,
  logoDataUri: LOGO,
};

/**
 * The inputs worth looking at: the ordinary card, plus every shape of awkward
 * the real world supplies. Keep this in step with MemberCard.stories.ts — the
 * two exist for the same reason, one in a browser and one in the rasterizer.
 */
const MEMBER_CASES = {
  WithLogo: MEMBER_BASE,
  WithoutLogo: { ...MEMBER_BASE, logoDataUri: null },
  FirstYear: { ...MEMBER_BASE, hearts: 1 },
  WithRecruits: { ...MEMBER_BASE, hearts: 6, recruits: 3 },
  FullRow: { ...MEMBER_BASE, hearts: 10 },
  SecondRowStarted: { ...MEMBER_BASE, hearts: 13 },
  LongLoyalty: { ...MEMBER_BASE, hearts: 34, recruits: 12 },
  Lapsed: { ...MEMBER_BASE, hearts: 3, periodText: "2024", lapsed: true },
  WithoutName: { ...MEMBER_BASE, memberName: null },
  LongNames: {
    ...MEMBER_BASE,
    memberName: "Anne-Margrethe Wollertsen Bjørnstad",
    organizationName: "Vestbygda Skolekorps og Ungdomsorkester",
    hearts: 7,
  },
};

/** The ORGANIZATION's card — a different owner, so a different fixture set. */
const ORG_CASES = {
  Ordinary: { joinUrl: JOIN_URL, organizationName: "Eksempel Musikkorps" },
  LongName: { joinUrl: JOIN_URL, organizationName: "Vestbygda Skolekorps og Ungdomsorkester" },
};

function parseArgs(argv) {
  const options = {
    kind: "member",
    cases: null,
    raster: false,
    time: 0,
    build: true,
    list: false,
    out: resolve(ROOT, ".card-preview"),
    overrides: {},
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--org-card") options.kind = "org";
    else if (arg === "--case") options.cases = next().split(",");
    else if (arg === "--raster") options.raster = true;
    else if (arg === "--time") options.time = Number(argv[++i] ?? 3);
    else if (arg === "--no-build") options.build = false;
    else if (arg === "--list") options.list = true;
    else if (arg === "--out") options.out = resolve(process.cwd(), next());
    else if (arg === "--set") {
      const [key, ...rest] = next().split("=");
      options.overrides[key] = coerce(rest.join("="));
    } else if (arg === "--help" || arg === "-h") options.list = "help";
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

function coerce(value) {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

const USAGE = `render-card — draw the project's cards without a server

  node .claude/skills/render-card/render.mjs [options]

  --case A,B               fixture name(s) to draw (default all); --list to see them
  --set key=value          override one fixture field, repeatable
                           e.g. --set hearts=17 --set memberName=null
  --org-card               draw the ORGANISATION's qrCardSvg instead
  --raster                 also rasterize via the shipped resvg + Fraunces path
  --time N                 with --raster: rasterize each card N extra times and
                           report ms per render — the Worker's CPU budget
  --out DIR                where to write (default <repo>/.card-preview)
  --no-build               skip rebuilding @stottemedlem/qr first
  --list                   list fixture names and exit

Writes card-<case>.svg, raster-*.png with --raster, and index.html —
open that with the preview-screenshot skill to see them all at once.`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cases = options.kind === "org" ? ORG_CASES : MEMBER_CASES;

  if (options.list === "help") {
    console.log(USAGE);
    return;
  }
  if (options.list) {
    console.log(Object.keys(cases).join("\n"));
    return;
  }

  if (options.build) {
    // Turbo caches this, so it costs ~40ms when nothing changed and is the
    // difference between reviewing your edit and reviewing the last build.
    const built = spawnSync("pnpm", ["turbo", "run", "build", "--filter=@stottemedlem/qr"], {
      cwd: ROOT,
      stdio: "pipe",
      encoding: "utf8",
    });
    if (built.status !== 0) {
      console.error(built.stdout ?? "", built.stderr ?? "");
      throw new Error("@stottemedlem/qr failed to build");
    }
  }
  if (!existsSync(QR_DIST)) {
    throw new Error(`no build at ${QR_DIST} — run: pnpm turbo run build --filter=@stottemedlem/qr`);
  }

  // Import by path: this script lives outside every workspace package, so
  // bare-specifier resolution of "@stottemedlem/qr" would fail here.
  const qr = await import(`${pathToFileURL(QR_DIST).href}?t=${Date.now()}`);

  const names = options.cases ?? Object.keys(cases);
  await mkdir(options.out, { recursive: true });

  const rendered = [];
  for (const name of names) {
    const fixture = cases[name];
    if (!fixture) throw new Error(`no such fixture: ${name} (try --list)`);
    const args = { ...fixture, ...options.overrides };
    const svg = options.kind === "org" ? qr.qrCardSvg(args) : qr.memberCardSvg(args);
    const file = `card-${name}`;
    await writeFile(resolve(options.out, `${file}.svg`), svg);
    rendered.push({ file, name, kind: options.kind, svg });
  }

  if (options.raster) await rasterize(rendered, options.out, qr, options.time);
  await writeFile(resolve(options.out, "index.html"), contactSheet(rendered, options.raster));

  console.log(`${rendered.length} card(s) → ${options.out}`);
  console.log(`contact sheet: ${resolve(options.out, "index.html")}`);
  if (!options.raster) console.log("(add --raster to see what the shared PNG actually looks like)");
}

/**
 * The shipped raster path, reproduced: the same @resvg/resvg-wasm the Worker
 * uses, the same embedded Fraunces, and system fonts off — so what lands here
 * is what an og:image or a receipt attachment would be.
 */
async function rasterize(rendered, out, qr, times = 0) {
  // resvg and the font both belong to the backoffice, so resolve from there —
  // this script sits outside every workspace package, so a bare specifier
  // ("@resvg/resvg-wasm") does not resolve from here at all.
  const require = createRequire(resolve(ROOT, "apps/backoffice/package.json"));
  const entry = pathToFileURL(require.resolve("@resvg/resvg-wasm")).href;
  // resvg's entry is CJS, so importing it lands the real exports on `default`.
  const loaded = await import(entry);
  const { initWasm, Resvg } = loaded.initWasm ? loaded : loaded.default;
  await initWasm(await readFile(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
  const font = await readFile(FONT);

  for (const item of rendered) {
    const width =
      item.kind === "org"
        ? Number(item.svg.match(/viewBox="0 0 ([\d.]+)/)?.[1] ?? 800)
        : qr.memberCardSize().width;
    const draw = () =>
      new Resvg(item.svg, {
        fitTo: { mode: "width", value: width },
        font: { fontBuffers: [font], defaultFontFamily: "Fraunces", loadSystemFonts: false },
      })
        .render()
        .asPng();
    await writeFile(resolve(out, `raster-${item.file}.png`), draw());

    // A render is the single most expensive thing this product asks a Worker
    // to do, and a Worker's CPU allowance is small — so the cost is worth
    // being able to measure, not guess, whenever a code path gains a render.
    if (times > 0) {
      const runs = [];
      for (let i = 0; i < times; i++) {
        const started = performance.now();
        draw();
        runs.push(performance.now() - started);
      }
      const each = runs.reduce((a, b) => a + b, 0) / runs.length;
      console.log(
        `⏱  ${item.file}: ${each.toFixed(0)} ms per render (${runs.length}× on this machine; ` +
          `a Worker is slower)`,
      );
    }
  }
}

/** One page showing every card drawn, so a single screenshot reviews the lot. */
function contactSheet(rendered, raster) {
  const rows = rendered
    .map(
      (item) => `<section>
  <h2>${item.name}</h2>
  <div class="pair">
    <figure><figcaption>browser (variable weights)</figcaption>${item.svg}</figure>
    ${raster ? `<figure><figcaption>resvg — what gets shared</figcaption><img src="raster-${item.file}.png" alt=""></figure>` : ""}
  </div>
</section>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Cards</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&display=swap');
body { margin: 0; padding: 20px; background: #e9e5df; font: 13px system-ui; }
h2 { margin: 0 0 6px; font: 600 12px ui-monospace, monospace; color: #5b5147; }
section { margin-bottom: 26px; }
.pair { display: flex; gap: 18px; align-items: flex-start; }
figure { margin: 0; flex: 1; min-width: 0; }
figcaption { font: 11px ui-monospace, monospace; color: #8a7f73; padding-bottom: 4px; }
svg, img { display: block; width: 100%; height: auto; }
</style>
${rows}
`;
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
