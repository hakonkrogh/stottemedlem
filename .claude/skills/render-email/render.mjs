#!/usr/bin/env node
// Renders one member notice from @stottemedlem/email straight from source:
// no dev server, no D1, no Resend. Prints the envelope + the text/plain body,
// writes the text/html body to a file, and can shoot it to a PNG.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = `${REPO}/packages/email/src`;

// The sources import each other as `./x.js` (the name tsc will emit), and
// Node's type stripping runs the .ts files without rewriting that. Point such
// an import at the .ts file beside it, so no build is needed here either.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("./") && specifier.endsWith(".js") && context.parentURL) {
      const ts = new URL(specifier.replace(/\.js$/, ".ts"), context.parentURL);
      if (existsSync(ts)) return next(ts.href, context);
    }
    return next(specifier, context);
  },
});

const { membershipReceipt } = await import(`${SRC}/membershipReceipt.ts`);
const { membershipReceiptPdf } = await import(`${SRC}/membershipReceiptPdf.ts`);
const { feeChangeNotice } = await import(`${SRC}/feeChangeNotice.ts`);
const { orgSignupNotice } = await import(`${SRC}/orgSignupNotice.ts`);

/**
 * A plain grey PNG in the card's proportions, so the inline picture has a
 * shape in the screenshot without a real card (see --card). No dependencies:
 * one IDAT of raw, filtered scanlines.
 */
function placeholderPng(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) =>
    (buf.reduce((c, b) => crcTable[(c ^ b) & 0xff] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      // A pale card with a darker footer band, like the real one.
      const footer = y > height * 0.85;
      row[1 + x * 3] = footer ? 0xe6 : 0xf4;
      row[2 + x * 3] = footer ? 0xdd : 0xf0;
      row[3 + x * 3] = footer ? 0xd1 : 0xeb;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A member and an org that are obviously fictional (never real org data). */
const ORG = {
  orgName: "Bakvendtland Skolekorps",
  orgNumber: "918 654 062",
  orgContactEmail: "post@bakvendtland.example",
  memberName: "Kari Nordmann",
  memberEmail: "kari@eksempel.example",
  tierName: "Støttemedlem",
  manageUrl: "https://app.example/bli-medlem/bakvendtland-skolekorps/min-side?n=man-tok",
};
const RECEIPT_URL = "https://app.example/bli-medlem/bakvendtland-skolekorps/kvittering?n=man-tok";
const RECEIPT = {
  ...ORG,
  periodText: "2026",
  periodStart: "2026-09-08",
  periodEnd: "2026-12-31",
  paidNok: 95,
  paidDate: "2026-09-08T09:30:00.000Z",
  kind: "join",
  receiptUrl: RECEIPT_URL,
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-tok",
  // A blank card stands in for the picture, so the wording and the layout
  // that depend on an attachment existing are what you see. --card swaps in
  // a real PNG (render-card draws one).
  cardPngBase64: placeholderPng(380, 600).toString("base64"),
  // The PDF is made for real below, unless --no-pdf.
  receiptPdfBase64: "JVBERi0=",
};

const SIGNUP = {
  to: "drift@bakvendtland.example",
  orgName: "Bakvendtland Skolekorps",
  orgnr: "123456785",
  slug: "bakvendtland-skolekorps",
  joinUrl: "https://xn--stttemedlem-hgb.no/bli-medlem/bakvendtland-skolekorps",
};

const FIXTURES = {
  "org-signup": () => orgSignupNotice(SIGNUP),
  "receipt-join": () => membershipReceipt(RECEIPT),
  "receipt-renewal": () =>
    membershipReceipt({
      ...RECEIPT,
      kind: "renewal",
      paidNok: 240,
      periodStart: "2027-01-01",
      periodEnd: "2027-12-31",
      periodText: "2027",
      paidDate: "2027-01-02T04:00:00.000Z",
    }),
  "receipt-no-card": () => membershipReceipt({ ...RECEIPT, cardPngBase64: null }),
  "receipt-no-pdf": () => membershipReceipt({ ...RECEIPT, receiptPdfBase64: null }),
  "receipt-bare-org": () =>
    membershipReceipt({ ...RECEIPT, orgNumber: null, orgContactEmail: null, memberName: null }),
  "fee-change-up": () =>
    feeChangeNotice({ ...ORG, previousFeeNok: 240, newFeeNok: 300, effectivePeriod: "2027" }),
  "fee-change-down": () =>
    feeChangeNotice({ ...ORG, previousFeeNok: 300, newFeeNok: 240, effectivePeriod: "2027" }),
};

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? null : args[at + 1];
};
const has = (name) => args.includes(`--${name}`);
/** The first bare word that is not a flag's value. */
const name = (() => {
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      if (["set", "card", "html", "png", "pdf", "width", "height"].includes(args[i].slice(2))) i++;
      continue;
    }
    return args[i];
  }
  return null;
})();

if (has("list") || !name || !FIXTURES[name]) {
  console.log(`usage: node render.mjs <notice> [--set key=value] [--card card.png] [--html out.html] [--png out.png] [--pdf out.pdf] [--no-pdf]

notices:
${Object.keys(FIXTURES)
  .map((k) => `  ${k}`)
  .join("\n")}`);
  process.exit(name && !FIXTURES[name] ? 1 : 0);
}

// --set overrides any field of the fixture: --set paidNok=1200 --set memberName=null
const overrides = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] !== "--set") continue;
  const [key, ...rest] = args[i + 1].split("=");
  const raw = rest.join("=");
  try {
    overrides[key] = JSON.parse(raw);
  } catch {
    overrides[key] = raw;
  }
}
const card = flag("card");
if (card) overrides.cardPngBase64 = readFileSync(card).toString("base64");

/** The receipt a fixture was built from, so the PDF and any override see the same facts. */
const receiptInput = (name) => {
  const built = FIXTURES[name]();
  const base = {
    ...RECEIPT,
    ...(name === "receipt-renewal"
      ? {
          kind: "renewal",
          paidNok: 240,
          periodStart: "2027-01-01",
          periodEnd: "2027-12-31",
          periodText: "2027",
          paidDate: "2027-01-02T04:00:00.000Z",
        }
      : {}),
    ...(name === "receipt-no-card" ? { cardPngBase64: null } : {}),
    ...(name === "receipt-no-pdf" ? { receiptPdfBase64: null } : {}),
    ...(name === "receipt-bare-org"
      ? { orgNumber: null, orgContactEmail: null, memberName: null }
      : {}),
    ...overrides,
  };
  return { built, base };
};

let message;
const outDir = mkdtempSync(`${tmpdir()}/notice-`);
let pdfPath = null;
if (name.startsWith("receipt")) {
  const { base } = receiptInput(name);
  // The real PDF, as the sweep makes it, unless the fixture or the flag says
  // the receipt goes out without one.
  if (base.receiptPdfBase64 && !has("no-pdf")) {
    const pdf = await membershipReceiptPdf(base);
    pdfPath = flag("pdf") ?? `${outDir}/kvittering.pdf`;
    writeFileSync(pdfPath, pdf);
    base.receiptPdfBase64 = Buffer.from(pdf).toString("base64");
  } else {
    base.receiptPdfBase64 = null;
  }
  message = membershipReceipt(base);
} else if (Object.keys(overrides).length > 0) {
  // Re-run the builder with the overrides applied, by rebuilding the fixture
  // input: the builders are pure, so this is the whole story.
  const build = name === "org-signup" ? orgSignupNotice : feeChangeNotice;
  const base =
    name === "org-signup"
      ? SIGNUP
      : { ...ORG, previousFeeNok: 240, newFeeNok: 300, effectivePeriod: "2027" };
  message = build({ ...base, ...overrides });
} else {
  message = FIXTURES[name]();
}

// The HTML body shows the attached card by content id, which only a mail
// client resolves. For the screenshot, inline the same bytes as a data URI.
const htmlPath = flag("html") ?? `${outDir}/${name}.html`;
const inlined = (message.attachments ?? []).reduce(
  (html, a) =>
    a.contentId
      ? html.replaceAll(`cid:${a.contentId}`, `data:${a.contentType};base64,${a.contentBase64}`)
      : html,
  message.html,
);
writeFileSync(htmlPath, inlined);

console.log(`notice:      ${name}`);
console.log(`to:          ${message.to}`);
console.log(`from name:   ${message.fromName}`);
console.log(`reply-to:    ${message.replyTo ?? "(none)"}`);
console.log(`subject:     ${message.subject}`);
console.log(
  `attachments: ${
    message.attachments
      ?.map(
        (a) =>
          `${a.filename} (${a.contentType}, ${Math.round((a.contentBase64.length * 3) / 4)} B)`,
      )
      .join(", ") ?? "(none)"
  }`,
);
console.log(`html:        ${htmlPath}`);
if (pdfPath) console.log(`pdf:         ${pdfPath}`);
console.log(`\n--- text/plain ---\n${message.text}\n--- end ---`);

const png = flag("png");
if (png) {
  execFileSync(
    "bash",
    [
      `${REPO}/.claude/skills/preview-screenshot/shot.sh`,
      `file://${htmlPath}`,
      png,
      flag("width") ?? "700",
      flag("height") ?? "900",
    ],
    { stdio: "inherit" },
  );
}
