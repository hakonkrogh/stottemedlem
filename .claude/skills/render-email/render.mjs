#!/usr/bin/env node
// Renders one member notice from @stottemedlem/email straight from source:
// no dev server, no D1, no Resend. Prints the envelope + the text/plain body,
// writes the text/html body to a file, and can shoot it to a PNG.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SRC = `${REPO}/packages/email/src`;
const { membershipReceipt } = await import(`${SRC}/membershipReceipt.ts`);
const { feeChangeNotice } = await import(`${SRC}/feeChangeNotice.ts`);

/** A member and an org that are obviously fictional (never real org data). */
const ORG = {
  orgName: "Eksempel Musikkorps",
  orgNumber: "918 654 062",
  orgContactEmail: "post@eksempel.example",
  memberName: "Kari Nordmann",
  memberEmail: "kari@eksempel.example",
  tierName: "Støttemedlem",
  manageUrl: "https://app.example/bli-medlem/eksempel/min-side?n=man-tok",
};
const RECEIPT = {
  ...ORG,
  periodText: "2026",
  periodStart: "2026-09-08",
  periodEnd: "2026-12-31",
  paidNok: 95,
  paidDate: "2026-09-08T09:30:00.000Z",
  kind: "join",
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-tok",
  // A stub stands in for the card picture, so the wording that depends on an
  // attachment existing is the wording you see. --card swaps in a real PNG.
  cardPngBase64: "aGVsbG8=",
};

const FIXTURES = {
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
      if (["set", "card", "html", "png", "width", "height"].includes(args[i].slice(2))) i++;
      continue;
    }
    return args[i];
  }
  return null;
})();

if (has("list") || !name || !FIXTURES[name]) {
  console.log(`usage: node render.mjs <notice> [--set key=value] [--card card.png] [--html out.html] [--png out.png]

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

let message = FIXTURES[name]();
if (Object.keys(overrides).length > 0) {
  // Re-run the builder with the overrides applied, by rebuilding the fixture
  // input: the builders are pure, so this is the whole story.
  const build = name.startsWith("receipt") ? membershipReceipt : feeChangeNotice;
  const base = name.startsWith("receipt")
    ? { ...RECEIPT, ...(name === "receipt-renewal" ? { kind: "renewal" } : {}) }
    : { ...ORG, previousFeeNok: 240, newFeeNok: 300, effectivePeriod: "2027" };
  message = build({ ...base, ...overrides });
}

const htmlPath = flag("html") ?? `${mkdtempSync(`${tmpdir()}/notice-`)}/${name}.html`;
writeFileSync(htmlPath, message.html);

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
