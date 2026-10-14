import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { CANONICAL_ORIGIN } from "@stottemedlem/core";
import {
  HEART,
  heartPath,
  MEMBER_CARD_HEIGHT,
  MEMBER_CARD_WIDTH,
  memberCardSvg,
  QR_CARD_HEIGHT,
  QR_CARD_WIDTH,
  qrCardSvg,
} from "@stottemedlem/qr";
import fraunces from "@stottemedlem/qr/fonts/Fraunces.ttf?inline";

/**
 * The picture a link to the front page shows when it is shared (og:image).
 *
 * Drawn at build time from the same two cards the front page shows, so a
 * shared link previews what the product actually hands out, with the brand
 * attribution on it (specs/concepts/brand-attribution.md). 1200x630 is the
 * shape link previews crop to.
 */

const WIDTH = 1200;
const HEIGHT = 630;
// The hero's own dark backdrop colour, and the cream its text is set in.
const BACKDROP = "#1a140c";
const CREAM = "#faf7f2";
const SOFT_CREAM = "#d9cfbf";

function nested(
  svg: string,
  size: { width: number; height: number },
  x: number,
  y: number,
  height: number,
  degrees: number,
): string {
  // A card is a whole <svg> document with its own size. Wrapping it in a
  // positioned <svg> with the card's viewBox scales it to `height`, and the
  // group tilts it about its own centre.
  const width = (size.width / size.height) * height;
  const centre = `${x + width / 2} ${y + height / 2}`;
  return `<g transform="rotate(${degrees} ${centre})"><svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${size.width} ${size.height}">${svg}</svg></g>`;
}

function previewSvg(): string {
  const qrCard = qrCardSvg({
    joinUrl: CANONICAL_ORIGIN,
    organizationName: "Bakvendtland Skolekorps",
  });
  const memberCard = memberCardSvg({
    memberName: "Kari Eksempel",
    memberNumber: 42,
    organizationName: "Bakvendtland Skolekorps",
    hearts: 8,
    recruits: 3,
    periodText: String(new Date().getFullYear()),
    joinUrl: CANONICAL_ORIGIN,
  });

  const memberCardSize = { width: MEMBER_CARD_WIDTH, height: MEMBER_CARD_HEIGHT };
  const qrCardSize = { width: QR_CARD_WIDTH, height: QR_CARD_HEIGHT };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKDROP}"/>
  ${heartPath(72, 150, 64, HEART)}
  <text x="150" y="203" font-family="Fraunces" font-size="60" fill="${CREAM}">støttemedlem.no</text>
  <text font-family="Fraunces" font-size="34" fill="${CREAM}">
    <tspan x="76" y="290">Register og årskontingent</tspan>
    <tspan x="76" y="334">for støttemedlemmer,</tspan>
    <tspan x="76" y="378">med Vipps.</tspan>
  </text>
  <text x="76" y="460" font-family="Fraunces" font-size="24" fill="${SOFT_CREAM}">For korps, kor, lag og foreninger.</text>
  ${nested(qrCard, qrCardSize, 676, 190, 320, -6)}
  ${nested(memberCard, memberCardSize, 762, 95, 440, 4)}
</svg>`;
}

function fontBytes(): Uint8Array {
  // Vite inlines the font as a base64 data URI; the renderer wants the bytes.
  return Buffer.from(String(fraunces).split(",")[1] ?? "", "base64");
}

export async function GET(): Promise<Response> {
  const require = createRequire(import.meta.url);
  await initWasm(await readFile(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));

  const renderer = new Resvg(previewSvg(), {
    fitTo: { mode: "width", value: WIDTH },
    font: {
      fontBuffers: [fontBytes()],
      defaultFontFamily: "Fraunces",
      loadSystemFonts: false,
    },
  });
  return new Response(new Uint8Array(renderer.render().asPng()), {
    headers: { "Content-Type": "image/png" },
  });
}
