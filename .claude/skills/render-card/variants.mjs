#!/usr/bin/env node
/**
 * Draw several VERSIONS of the member card side by side, without touching the
 * shipped code and without a build step (specs/concepts/member-card.md).
 *
 * A design pass (colours, rules, a footer field, a tear line) needs the same
 * fixtures drawn through the same resvg + embedded-Fraunces path for each
 * idea, on one contact sheet. Doing that by hand meant reconstructing the
 * qrcode-import patch, the rasterizer and the fixture list every time
 * (2026-09-04 and again 2026-09-21), so this does it:
 *
 *   node variants.mjs --init A,B,C --dir $SCRATCH/alt
 *       copies packages/qr/src/memberCard.ts to card-A.ts, card-B.ts, ...
 *       in --dir, next to a brand.ts whose `qrcode` import resolves from
 *       there. Edit each card-<name>.ts freely (Node 24 strips the types, so
 *       the copies run as they are).
 *   node variants.mjs --dir $SCRATCH/alt [--variants A,B] [--case WithLogo,Lapsed]
 *       draws every card-<name>.ts in --dir (plus "current", the built
 *       package) for the chosen fixtures and writes <dir>/out/index.html.
 *       Screenshot that one file with preview-screenshot to see them all.
 *
 * The fixtures are render.mjs's own, so a variant is judged on exactly the
 * cases the shipped card is. A variant that inverts the card MUST give the QR
 * modules their own colour: the code is drawn in INK, and a cream ink on the
 * white panel renders an unscannable blank (2026-09-04).
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FONT, MEMBER_CASES } from "./render.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const QR_SRC = resolve(ROOT, "packages/qr/src");
const QR_DIST = resolve(ROOT, "packages/qr/dist/index.js");

function parseArgs(argv) {
  const options = { dir: null, init: null, variants: null, cases: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--dir") options.dir = resolve(next());
    else if (arg === "--init") options.init = next().split(",");
    else if (arg === "--variants") options.variants = next().split(",");
    else if (arg === "--case") options.cases = next().split(",");
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.dir && !options.help) throw new Error("--dir is required");
  return options;
}

function usage() {
  console.log(`usage: node variants.mjs --dir DIR [--init A,B] [--variants A,B] [--case WithLogo,Lapsed]

  --init NAMES   copy memberCard.ts to DIR/card-<name>.ts for each name, plus
                 a brand.ts that runs from there; then exit
  --variants     which card-<name>.ts to draw (default: every one in DIR)
  --case         fixtures to draw (default: WithLogo,WithRecruits,Lapsed,VeryLongOrgName;
                 names as render.mjs --list)
`);
}

async function init(dir, names) {
  await mkdir(dir, { recursive: true });
  const brand = (await readFile(resolve(QR_SRC, "brand.ts"), "utf8")).replace(
    'import { create } from "qrcode";',
    `import { createRequire } from "node:module";\nconst create = createRequire(${JSON.stringify(resolve(ROOT, "packages/qr/package.json"))})("qrcode").create;`,
  );
  if (!brand.includes("createRequire"))
    throw new Error("brand.ts: qrcode import not found; update the patch");
  await writeFile(resolve(dir, "brand.ts"), brand);
  const card = (await readFile(resolve(QR_SRC, "memberCard.ts"), "utf8")).replace(
    'from "./brand.js"',
    'from "./brand.ts"',
  );
  for (const name of names) {
    const file = resolve(dir, `card-${name}.ts`);
    if (existsSync(file)) {
      console.log(`kept ${file} (exists)`);
      continue;
    }
    await writeFile(file, card);
    console.log(`wrote ${file}`);
  }
}

async function draw(dir, variants, cases) {
  for (const name of cases) if (!MEMBER_CASES[name]) throw new Error(`unknown fixture: ${name}`);
  const out = resolve(dir, "out");
  await mkdir(out, { recursive: true });

  const require = createRequire(resolve(ROOT, "apps/backoffice/package.json"));
  const loaded = await import(pathToFileURL(require.resolve("@resvg/resvg-wasm")).href);
  const { initWasm, Resvg } = loaded.initWasm ? loaded : loaded.default;
  await initWasm(await readFile(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
  const font = await readFile(FONT);

  const sections = [];
  for (const variant of ["current", ...variants]) {
    const modulePath = variant === "current" ? QR_DIST : resolve(dir, `card-${variant}.ts`);
    if (!existsSync(modulePath))
      throw new Error(
        `${modulePath} is missing${variant === "current" ? " (run render.mjs once to build @stottemedlem/qr)" : ""}`,
      );
    const { memberCardSvg } = await import(pathToFileURL(modulePath).href);
    const figures = [];
    for (const name of cases) {
      const svg = memberCardSvg(MEMBER_CASES[name]);
      const file = `${variant}-${name}`;
      await writeFile(resolve(out, `${file}.svg`), svg);
      const png = new Resvg(svg, {
        fitTo: { mode: "width", value: 760 },
        font: { fontBuffers: [font], defaultFontFamily: "Fraunces", loadSystemFonts: false },
      })
        .render()
        .asPng();
      await writeFile(resolve(out, `${file}.png`), png);
      figures.push(
        `<figure><figcaption>${name}</figcaption><img src="${file}.png" alt=""></figure>`,
      );
    }
    sections.push(
      `<section><h2>${variant}</h2><div class="row">${figures.join("")}</div></section>`,
    );
    console.log(`${variant}: ${cases.length} card(s)`);
  }

  await writeFile(
    resolve(out, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>card variants</title><style>
body{margin:0;padding:20px;background:#f6f1e7;font:13px system-ui}
h2{margin:0 0 6px;font:600 14px ui-monospace,monospace}
.row{display:flex;gap:16px;margin-bottom:28px}
figure{margin:0;width:380px}img{width:380px;display:block}
figcaption{font:11px ui-monospace,monospace;color:#8a7f73;padding-bottom:4px}
</style>${sections.join("")}`,
  );
  console.log(`contact sheet: ${resolve(out, "index.html")}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();
  if (options.init) return init(options.dir, options.init);
  const variants =
    options.variants ??
    (await readdir(options.dir))
      .filter((file) => /^card-.+\.ts$/.test(file))
      .map((file) => file.slice(5, -3))
      .sort();
  if (variants.length === 0)
    throw new Error(`no card-<name>.ts in ${options.dir}; run --init first`);
  await draw(
    options.dir,
    variants,
    options.cases ?? ["WithLogo", "WithRecruits", "Lapsed", "VeryLongOrgName"],
  );
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
