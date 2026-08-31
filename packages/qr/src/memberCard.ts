/**
 * The member's card (specs/concepts/member-card.md) — a supporting member's
 * proof that they back an organization, drawn as one self-contained SVG.
 *
 * One drawing, every surface: it is what the member sees on their own page,
 * what a social feed previews when they share the address, and (rasterized)
 * what rides along with their receipt. Keeping it a single artifact is the
 * point — the card someone shares must be the card they were shown.
 *
 * Two constraints shape the drawing:
 *  - **No emoji.** The card is rasterized on a server with exactly one
 *    embedded font and no colour-emoji font, so every heart — including the
 *    brand mark in the attribution — is a vector path, which
 *    specs/concepts/brand-mark.md explicitly allows for surfaces that cannot
 *    rely on emoji fonts.
 *  - **1.91:1.** That is the shape social platforms preview without cropping,
 *    and a card that gets cropped loses the name or the attribution.
 */

import { create } from "qrcode";

/** Card canvas — 1.91:1, the aspect ratio link previews show uncropped. */
export const MEMBER_CARD_WIDTH = 1200;
export const MEMBER_CARD_HEIGHT = 628;

const CREAM = "#fdf8f0";
const CARD = "#ffffff";
const EDGE = "#eadfce";
const INK = "#2b2118";
const MUTED = "#7a6a58";
const FAINT = "#9c8d7b";
const HEART = "#e0182d";
const ACCENT = "#b8860b";
const FONT = "Fraunces, Georgia, serif";

const HEARTS_PER_ROW = 10;

export interface MemberCardOptions {
  /** The member's own name; falls back to a neutral label when unknown. */
  memberName?: string | null;
  organizationName: string;
  /** One heart per supported annual period (specs/concepts/scorecard.md). */
  hearts: number;
  /** Shown only when there are any — a zero is not worth showing. */
  recruits?: number;
  /** The period the card is good for, as people read it: "2026". */
  periodText: string;
  /** Whether that period is the current one. A lapsed card still tells the truth. */
  lapsed?: boolean;
  /** Where the QR code leads — the join page, carrying the member's referral. */
  joinUrl: string;
  /**
   * The organization's logo as a self-contained data URI. Anything else would
   * make the card depend on a second request that a rasterizer or an offline
   * reader cannot make.
   */
  logoDataUri?: string | null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Shrink a line until it plausibly fits, and only then cut it. Names are the
 * one thing on this card that belongs to a person, so the card bends before it
 * truncates.
 */
function fitLine(text: string, maxWidth: number, preferred: number, min: number) {
  // Fraunces at these sizes averages a little over half the em per character.
  const widthPerPoint = 0.54;
  let size = preferred;
  while (size > min && text.length * size * widthPerPoint > maxWidth) size -= 2;
  const maxChars = Math.floor(maxWidth / (size * widthPerPoint));
  const value = text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
  return { value, size };
}

/** A filled heart, drawn at (x, y) with the given box size. */
function heartPath(x: number, y: number, size: number, fill: string): string {
  const scale = size / 24;
  return `<path transform="translate(${x} ${y}) scale(${scale})" fill="${fill}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`;
}

/** One `<path>` covering every dark module of the QR code. */
function qrModulesPath(url: string): { path: string; moduleCount: number } {
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

/**
 * The hearts as a game-HUD buildup: ten to a row, a new row underneath, only
 * ever the hearts actually earned (specs/concepts/scorecard.md). A member with
 * a long history gets smaller hearts rather than a card that overflows.
 */
function heartRows(count: number, x: number, y: number, maxWidth: number): string {
  const rows = Math.ceil(count / HEARTS_PER_ROW) || 1;
  const gap = 6;
  // Fit ten across the column, then shrink again if the rows stack too deep.
  let size = Math.min(38, (maxWidth - gap * (HEARTS_PER_ROW - 1)) / HEARTS_PER_ROW);
  if (rows > 3) size = Math.min(size, 22);
  const step = size + gap;

  const shapes: string[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / HEARTS_PER_ROW);
    const column = index % HEARTS_PER_ROW;
    shapes.push(heartPath(x + column * step, y + row * step, size, HEART));
  }
  return shapes.join("");
}

/** How tall `heartRows` drew, so what follows knows where it may start. */
function heartRowsHeight(count: number, maxWidth: number): number {
  if (count <= 0) return 0;
  const rows = Math.ceil(count / HEARTS_PER_ROW);
  const gap = 6;
  let size = Math.min(38, (maxWidth - gap * (HEARTS_PER_ROW - 1)) / HEARTS_PER_ROW);
  if (rows > 3) size = Math.min(size, 22);
  return rows * (size + gap);
}

export function memberCardSvg(options: MemberCardOptions): string {
  const hearts = Math.max(0, Math.floor(options.hearts));
  const recruits = Math.max(0, Math.floor(options.recruits ?? 0));
  const orgName = options.organizationName.trim();
  const memberName = options.memberName?.trim() || "Støttemedlem";

  const pad = 44;
  const inner = 24;
  const columnWidth = 600;
  const left = inner + pad;

  const hasLogo = Boolean(options.logoDataUri);
  const logoSize = 76;
  const orgTextX = hasLogo ? left + logoSize + 20 : left;
  const org = fitLine(orgName, columnWidth - (orgTextX - left), 30, 18);
  const name = fitLine(memberName, columnWidth, 56, 28);

  const heartsTop = 320;
  const heartsHeight = heartRowsHeight(hearts, columnWidth);
  const heartsLabel = hearts === 1 ? "1 år som støttemedlem" : `${hearts} år som støttemedlem`;

  const validity = options.lapsed
    ? `Støttet til og med ${options.periodText}`
    : `Gyldig medlemskap ${options.periodText}`;

  const { path, moduleCount } = qrModulesPath(options.joinUrl);
  const qrSize = 224;
  const qrX = MEMBER_CARD_WIDTH - inner - pad - qrSize;
  const qrY = 214;
  const qrScale = qrSize / moduleCount;

  const alt = `Medlemsbevis: ${memberName} er støttemedlem i ${orgName}, med ${hearts} hjerter.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MEMBER_CARD_WIDTH} ${MEMBER_CARD_HEIGHT}" width="${MEMBER_CARD_WIDTH}" height="${MEMBER_CARD_HEIGHT}" role="img" aria-label="${escapeXml(alt)}">
  <title>${escapeXml(alt)}</title>
  <rect width="${MEMBER_CARD_WIDTH}" height="${MEMBER_CARD_HEIGHT}" fill="${CREAM}"/>
  <rect x="${inner}" y="${inner}" width="${MEMBER_CARD_WIDTH - inner * 2}" height="${MEMBER_CARD_HEIGHT - inner * 2}" rx="28" fill="${CARD}" stroke="${EDGE}" stroke-width="2"/>
${
  hasLogo
    ? `  <defs><clipPath id="logo-circle"><circle cx="${left + logoSize / 2}" cy="${72 + logoSize / 2}" r="${logoSize / 2}"/></clipPath></defs>
  <circle cx="${left + logoSize / 2}" cy="${72 + logoSize / 2}" r="${logoSize / 2}" fill="#ffffff" stroke="${EDGE}" stroke-width="2"/>
  <image x="${left}" y="72" width="${logoSize}" height="${logoSize}" href="${escapeXml(options.logoDataUri ?? "")}" clip-path="url(#logo-circle)" preserveAspectRatio="xMidYMid slice"/>`
    : ""
}
  <text x="${orgTextX}" y="${hasLogo ? 100 : 92}" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="3" fill="${ACCENT}">STØTTEMEDLEM</text>
  <text x="${orgTextX}" y="${hasLogo ? 136 : 128}" font-family="${FONT}" font-size="${org.size}" font-weight="600" fill="${MUTED}">${escapeXml(org.value)}</text>

  <text x="${left}" y="248" font-family="${FONT}" font-size="${name.size}" font-weight="700" fill="${INK}">${escapeXml(name.value)}</text>
  <text x="${left}" y="290" font-family="${FONT}" font-size="20" fill="${MUTED}">${escapeXml(validity)}</text>

${heartRows(hearts, left, heartsTop, columnWidth)}
  <text x="${left}" y="${heartsTop + heartsHeight + 28}" font-family="${FONT}" font-size="17" fill="${MUTED}">${escapeXml(heartsLabel)}${
    recruits > 0
      ? escapeXml(` · vervet ${recruits} ${recruits === 1 ? "medlem" : "medlemmer"}`)
      : ""
  }</text>

  <rect x="${qrX - 16}" y="${qrY - 16}" width="${qrSize + 32}" height="${qrSize + 32}" rx="18" fill="${CREAM}"/>
  <g transform="translate(${qrX} ${qrY}) scale(${qrScale})"><path d="${path}" fill="${INK}"/></g>
  <text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 46}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${MUTED}">Skann og bli støttemedlem</text>
  <text x="${qrX + qrSize / 2}" y="${qrY + qrSize + 70}" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${FAINT}">i ${escapeXml(fitLine(orgName, qrSize + 60, 14, 11).value)}</text>

  <line x1="${left}" y1="${MEMBER_CARD_HEIGHT - inner - pad - 46}" x2="${MEMBER_CARD_WIDTH - inner - pad}" y2="${MEMBER_CARD_HEIGHT - inner - pad - 46}" stroke="#f2ebdf" stroke-width="2"/>
${heartPath(left, MEMBER_CARD_HEIGHT - inner - pad - 18, 18, HEART)}
  <text x="${left + 26}" y="${MEMBER_CARD_HEIGHT - inner - pad - 3}" font-family="${FONT}" font-size="15" fill="${FAINT}">støttemedlem.no</text>
</svg>
`;
}
