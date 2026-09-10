/**
 * What the two cards share: the typeface, the ink, the heart, and the code.
 *
 * The product draws two cards (specs/concepts/member-card.md and
 * specs/use-cases/promote-with-qr-card.md). They belong to different owners,
 * but a person can hold both at once (a member's card and the poster their
 * organization hung up), so they are set in one typeface, on one ink, with one
 * heart. Keeping those here means they cannot drift apart a shade at a time;
 * before this module the QR card was set in system sans on cool grey with a
 * green eyebrow and an emoji heart, and it read as another product's card.
 */

import { create } from "qrcode";

/**
 * The stack a browser resolves when it draws a card SVG itself: "Fraunces" is
 * the rasterizer's embedded face (and the one an SVG carries when it is served
 * as an image), "Fraunces Variable" the same family the website loads
 * (packages/ui tokens), so an inline card matches the shipped picture instead
 * of falling back to Georgia.
 *
 * One weight, 650, everywhere on both cards: it is the brand cut the embedded
 * face is a static instance of, so nothing a card asks for can come out
 * differently in a browser than in the rasterizer.
 */
export const FONT = "Fraunces, 'Fraunces Variable', Georgia, serif";
export const FONT_WEIGHT = 650;

/**
 * The cards' ink (specs/concepts/brand-palette.md): warm, the way the rest of
 * the product is warm, never cool grey. A card carries NO green: it presents
 * two other parties, and the product's own action colour is a third voice on
 * it.
 */
export const CARD = "#ffffff";
export const EDGE = "#e6dccb";
export const HAIRLINE = "#eee5d6";
export const INK = "#221a12";
export const DEEP = "#3b2d1c";
export const MUTED = "#6e6353";
export const FAINT = "#978a78";
/** The one colour on either card: the brand mark (specs/concepts/brand-mark.md). */
export const HEART = "#e0182d";

/** Coordinates to one decimal: the arithmetic is fractional, the file needn't be. */
export function r(value: number): number {
  return Math.round(value * 10) / 10;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * A filled heart, drawn at (x, y) with the given box size.
 *
 * Drawn, not typed: a card is rasterized with exactly one embedded font and no
 * colour-emoji font, so a "❤️" comes out as an empty box. The brand mark spec
 * allows the shape to stand in for the character on surfaces like these.
 */
export function heartPath(x: number, y: number, size: number, fill: string): string {
  const scale = size / 24;
  return `<path transform="translate(${r(x)} ${r(y)}) scale(${r(scale)})" fill="${fill}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`;
}

/** One `<path>` covering every dark module of the QR code. */
export function qrModulesPath(url: string): { path: string; moduleCount: number } {
  const qr = create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const segments: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) segments.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { path: segments.join(""), moduleCount: size };
}
