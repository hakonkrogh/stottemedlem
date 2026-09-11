/**
 * @stottemedlem/qr — shared QR code generation.
 *
 * Turns an organization's join page URL into scannable artifacts:
 * a plain QR code (SVG) and a presentable "QR code card" (SVG) that
 * organizations can print, download, and embed on external websites.
 *
 * This entry is fully isomorphic — bundle it for the browser freely.
 * PNG encoding lives in `@stottemedlem/qr/node` (Workers/Node runtimes);
 * DOM-only helpers (rasterize/download) in `@stottemedlem/qr/browser`.
 */

import { toString as toStringQr } from "qrcode";
import {
  CARD,
  DEEP,
  EDGE,
  escapeXml,
  FAINT,
  FONT,
  FONT_WEIGHT,
  HAIRLINE,
  HEART,
  heartPath,
  INK,
  MUTED,
  qrModulesPath,
  r,
} from "./brand.js";

/** The member's own card — a different owner from the organization's card below. */
export {
  MEMBER_CARD_HEIGHT,
  MEMBER_CARD_WIDTH,
  type MemberCardOptions,
  memberCardNameBand,
  memberCardSize,
  memberCardSvg,
} from "./memberCard.js";

export interface QrOptions {
  /** Rendered width in pixels (PNG) or the `width` attribute (SVG). */
  width?: number;
  /** Quiet zone around the code, in modules. */
  margin?: number;
}

/** A plain QR code as a standalone SVG document. */
export async function qrSvg(url: string, options: QrOptions = {}): Promise<string> {
  return toStringQr(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    width: options.width ?? 512,
    margin: options.margin ?? 2,
  });
}

export interface QrCardOptions {
  /** The organization's join page — what the QR code encodes. */
  joinUrl: string;
  /** The organization's public-facing name, shown on the card. */
  organizationName: string;
  /** Eyebrow line above the name. */
  title?: string;
  /** Call to action under the QR code. */
  hint?: string;
  /**
   * The wordmark at the bottom of the card. The heart in front of it is drawn,
   * not typed, so it is not part of this string.
   */
  footer?: string;
}

/** Card canvas size — consumers can rely on this aspect ratio when embedding. */
export const QR_CARD_WIDTH = 400;
export const QR_CARD_HEIGHT = 520;

/**
 * The card carries NO green (specs/concepts/brand-palette.md). The eyebrow
 * over the organization's name was moss until 2026-09-10, and before that
 * Vipps orange; both were the product talking on an object whose whole job is
 * to present ONE organization and hand a stranger a way in. It is the card's
 * own ink now, and the heart at the bottom is the only colour left: the same
 * rule the member's card already follows.
 */
const EYEBROW = DEEP;

/** Shrink the name to fit the card's width on a single line. */
function nameFontSize(name: string): number {
  if (name.length <= 18) return 24;
  if (name.length <= 26) return 20;
  if (name.length <= 36) return 16;
  return 13;
}

/**
 * The attribution, with its heart drawn rather than typed
 * (specs/concepts/brand-attribution.md, specs/concepts/brand-mark.md).
 *
 * The pair is centred as one unit: the heart is placed from the width of both
 * rather than from a hand-picked x, so a shorter or longer wordmark stays in
 * the middle of a card that gets printed at sizes nobody here chooses.
 */
function attribution(center: number, baseline: number, label: string, size: number): string {
  const heartSize = size + 2;
  const gap = 7;
  // Fraunces averages a little over half the em per character; erring wide
  // only nudges the pair a hair left of true centre.
  const width = heartSize + gap + label.length * size * 0.57;
  const left = center - width / 2;
  return `<g>
    ${heartPath(left, baseline - heartSize + 2, heartSize, HEART)}
    <text x="${r(left + heartSize + gap)}" y="${baseline}" font-family="${FONT}" font-size="${size}" font-weight="${FONT_WEIGHT}" fill="${FAINT}">${escapeXml(label)}</text>
  </g>`;
}

/**
 * The QR code card: a self-contained SVG the size of a small poster tile,
 * carrying the organization's name, a join invitation, and the QR code.
 * Suitable for downloading, printing, and hot-linking from external websites.
 */
export function qrCardSvg(options: QrCardOptions): string {
  const name = options.organizationName.trim();
  const title = options.title ?? "Bli støttemedlem";
  const hint = options.hint ?? "Skann med mobilen — betal med Vipps";
  const footer = options.footer ?? "støttemedlem.no";

  const { path, moduleCount } = qrModulesPath(options.joinUrl);
  const qrSize = 264;
  const qrX = (QR_CARD_WIDTH - qrSize) / 2;
  const qrY = 128;
  const scale = qrSize / moduleCount;
  const center = QR_CARD_WIDTH / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}" width="${QR_CARD_WIDTH}" height="${QR_CARD_HEIGHT}" role="img" aria-label="${escapeXml(`${title} i ${name}`)}">
  <title>${escapeXml(`${title} i ${name}`)}</title>
  <rect x="8" y="8" width="${QR_CARD_WIDTH - 16}" height="${QR_CARD_HEIGHT - 16}" rx="24" fill="${CARD}" stroke="${EDGE}" stroke-width="2"/>
  <text x="${center}" y="64" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="${FONT_WEIGHT}" letter-spacing="2.5" fill="${EYEBROW}">${escapeXml(title.toUpperCase())}</text>
  <text x="${center}" y="99" text-anchor="middle" font-family="${FONT}" font-size="${nameFontSize(name)}" font-weight="${FONT_WEIGHT}" fill="${INK}">${escapeXml(name)}</text>
  <g transform="translate(${qrX} ${qrY}) scale(${scale})">
    <path d="${path}" fill="${INK}"/>
  </g>
  <text x="${center}" y="434" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="${FONT_WEIGHT}" fill="${MUTED}">${escapeXml(hint)}</text>
  <line x1="48" y1="458" x2="${QR_CARD_WIDTH - 48}" y2="458" stroke="${HAIRLINE}" stroke-width="2"/>
  ${attribution(center, 489, footer, 13)}
</svg>
`;
}
