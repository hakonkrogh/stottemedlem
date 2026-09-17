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

/** The heart's outline, drawn in a 24x24 box (`HEART_BOX`). */
const HEART_D =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
const HEART_BOX = 24;

/**
 * A filled heart, drawn at (x, y) with the given box size.
 *
 * Drawn, not typed: a card is rasterized with exactly one embedded font and no
 * colour-emoji font, so a "❤️" comes out as an empty box. The brand mark spec
 * allows the shape to stand in for the character on surfaces like these.
 */
export function heartPath(x: number, y: number, size: number, fill: string): string {
  const scale = size / HEART_BOX;
  return `<path transform="translate(${r(x)} ${r(y)}) scale(${r(scale)})" fill="${fill}" d="${HEART_D}"/>`;
}

/**
 * How much of a code's width the heart in its middle may take.
 *
 * A logo on a QR code is not a feature of the QR standard, which says nothing
 * about them: it is damage, and the code survives it only because
 * Reed-Solomon can rebuild a share of the codewords (about 15% at the level M
 * these codes are drawn at). So this number is measured, not chosen. At M our
 * two payloads stop decoding above a cover of 32% (the organization's join
 * address) and 28% (a member's scan address) of the code's width. Rounding to
 * whole modules lands a little either side of this number (13.5% on the
 * organization's code, 17% on the shorter member one), so the real covers sit
 * between 1.6 and 2.4 times inside their breaking points: the margin a code
 * needs when the reader is a phone camera pointed at a printed card rather
 * than a decoder handed clean pixels. Re-measure with `budget.mjs` in the
 * verify-qr skill before changing it.
 */
const HEART_SHARE = 0.15;

/**
 * The QR structures that must survive whatever is drawn on a code: the finder
 * squares, the timing lines, the format information, and the alignment
 * patterns. The middle of a code is data, and data is interleaved across the
 * error-correction blocks, so a blot there spreads its damage evenly instead
 * of exhausting one block, which is why the middle is the one safe place to
 * cover. With ONE exception: from version 7 a code carries an alignment
 * pattern at its exact centre, and that is structure, not data. Such a code
 * gets no heart rather than a heart that might cost someone a scan. Neither
 * card reaches version 7 today (a member's scan address is version 3, an
 * organization's join address version 5), so this is a guard, not a case.
 */
const FIRST_VERSION_WITH_CENTRE_ALIGNMENT = 7;

/** The blanked square in the middle of a code, in modules. */
export interface QrHeartHole {
  /** Row and column the hole starts at; it is square, so one number does both. */
  from: number;
  size: number;
}

export interface QrCode {
  path: string;
  moduleCount: number;
  /** Null when the code is drawn whole. */
  hole: QrHeartHole | null;
}

/**
 * An odd number of modules, so the hole centres on a module rather than
 * straddling two: a QR code is always an odd number of modules a side.
 */
function heartHoleSize(moduleCount: number): number {
  const ideal = moduleCount * HEART_SHARE;
  return Math.max(3, Math.round((ideal - 1) / 2) * 2 + 1);
}

/**
 * One `<path>` covering every dark module of the QR code, with the middle left
 * blank when the code is to carry the heart.
 *
 * The hole is left out of the path rather than painted over: the white behind
 * the heart is then the card itself, with no second shape to keep aligned with
 * the module grid, and nothing is drawn twice where a rasterizer could leave a
 * seam. The heart needs that white whatever we do: `HEART` is dark enough
 * that a scanner reading luminance can take it for a module.
 */
export function qrModulesPath(url: string, options: { heart?: boolean } = {}): QrCode {
  const qr = create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const holeSize = heartHoleSize(size);
  const hole =
    options.heart && qr.version < FIRST_VERSION_WITH_CENTRE_ALIGNMENT
      ? { from: (size - holeSize) / 2, size: holeSize }
      : null;
  const inHole = (row: number, col: number): boolean =>
    hole !== null &&
    row >= hole.from &&
    row < hole.from + hole.size &&
    col >= hole.from &&
    col < hole.from + hole.size;
  const segments: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col) && !inHole(row, col)) segments.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { path: segments.join(""), moduleCount: size, hole };
}

/**
 * The heart that sits in the hole, in MODULE coordinates: it belongs inside
 * the same scaled group as the code's own path, so it grows and shrinks with
 * the code and no call site has to convert anything.
 *
 * It is drawn smaller than the hole so a ring of white separates it from the
 * modules around it. Nothing here is rounded the way the rest of the card is:
 * at this scale a module is one unit, so `r()`'s one decimal would be a third
 * of the heart.
 */
export function qrHeartMark(qr: QrCode): string {
  if (qr.hole === null) return "";
  const size = qr.hole.size * 0.72;
  const offset = qr.hole.from + (qr.hole.size - size) / 2;
  const scale = size / HEART_BOX;
  return `<path transform="translate(${offset} ${offset}) scale(${scale})" fill="${HEART}" d="${HEART_D}"/>`;
}
