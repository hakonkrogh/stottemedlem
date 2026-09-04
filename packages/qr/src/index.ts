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

import { create, toString as toStringQr } from "qrcode";

/** The member's own card — a different owner from the organization's card below. */
export {
  MEMBER_CARD_HEIGHT,
  MEMBER_CARD_WIDTH,
  type MemberCardOptions,
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
  /** Attribution at the bottom of the card. */
  footer?: string;
}

/** Card canvas size — consumers can rely on this aspect ratio when embedding. */
export const QR_CARD_WIDTH = 400;
export const QR_CARD_HEIGHT = 520;

// The brand's one action colour (specs/concepts/brand-palette.md). It was Vipps
// orange until 2026-09-04; a warm accent next to the red heart was the very
// thing the palette refresh removed, and Vipps is named in the hint anyway.
const ACCENT = "#3d6b3f";
const INK = "#1c1917";
const MUTED = "#57534e";
const FAINT = "#a8a29e";
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Shrink the name to fit the card's width on a single line. */
function nameFontSize(name: string): number {
  if (name.length <= 18) return 24;
  if (name.length <= 26) return 20;
  if (name.length <= 36) return 16;
  return 13;
}

/** One `<path>` covering every dark module of the QR code. */
function qrModulesPath(url: string): { path: string; moduleCount: number } {
  const qr = create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const segments: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) {
        segments.push(`M${col} ${row}h1v1h-1z`);
      }
    }
  }
  return { path: segments.join(""), moduleCount: size };
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
  // The heart is the brand mark — it travels with the attribution.
  const footer = options.footer ?? "❤️ støttemedlem.no";

  const { path, moduleCount } = qrModulesPath(options.joinUrl);
  const qrSize = 264;
  const qrX = (QR_CARD_WIDTH - qrSize) / 2;
  const qrY = 128;
  const scale = qrSize / moduleCount;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}" width="${QR_CARD_WIDTH}" height="${QR_CARD_HEIGHT}" role="img" aria-label="${escapeXml(`${title} i ${name}`)}">
  <title>${escapeXml(`${title} i ${name}`)}</title>
  <rect x="8" y="8" width="${QR_CARD_WIDTH - 16}" height="${QR_CARD_HEIGHT - 16}" rx="24" fill="#ffffff" stroke="#e7e5e4" stroke-width="2"/>
  <text x="${QR_CARD_WIDTH / 2}" y="64" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="2.5" fill="${ACCENT}">${escapeXml(title.toUpperCase())}</text>
  <text x="${QR_CARD_WIDTH / 2}" y="98" text-anchor="middle" font-family="${FONT}" font-size="${nameFontSize(name)}" font-weight="700" fill="${INK}">${escapeXml(name)}</text>
  <g transform="translate(${qrX} ${qrY}) scale(${scale})">
    <path d="${path}" fill="${INK}"/>
  </g>
  <text x="${QR_CARD_WIDTH / 2}" y="434" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${MUTED}">${escapeXml(hint)}</text>
  <line x1="48" y1="458" x2="${QR_CARD_WIDTH - 48}" y2="458" stroke="#f0efee" stroke-width="2"/>
  <text x="${QR_CARD_WIDTH / 2}" y="488" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${FAINT}">${escapeXml(footer)}</text>
</svg>
`;
}
