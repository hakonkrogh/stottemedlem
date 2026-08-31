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
 *  - **Upright, and only upright.** A picture cannot reflow, and the surface
 *    that matters is a phone: an across-the-page card poured into a phone's
 *    width shrinks its QR code to something nobody can scan and its captions
 *    to something nobody can read. The card is laid out down the page so it
 *    is readable and scannable where it is actually held. A wide variant used
 *    to exist alongside it, purely because link previews show 1.91:1
 *    uncropped; it was dropped 2026-08-31 — one card, drawn once, is worth
 *    more than a preview that crops well.
 *
 * Nothing here is placed at a hand-picked y: the layout stacks its blocks and
 * centres the stack, so a member with one heart and a member with four rows of
 * them both get a balanced card instead of one with a hole in it.
 */

import { create } from "qrcode";

/**
 * Card canvas — upright, because a phone is where a member looks at their card
 * and where they hold its QR code up to a camera. There is exactly ONE card
 * (decided 2026-08-31): a second, wide version previewed better in a social
 * feed but meant two drawings to keep saying the same thing, and the card a
 * member is shown must be the card they share.
 */
export const MEMBER_CARD_WIDTH = 760;
export const MEMBER_CARD_HEIGHT = 1040;

/** The canvas — what an `<img>` needs to reserve space. */
export function memberCardSize(): { width: number; height: number } {
  return { width: MEMBER_CARD_WIDTH, height: MEMBER_CARD_HEIGHT };
}

const CREAM = "#fdf8f0";
const CARD = "#ffffff";
const BAND = "#fbf2e1";
const EDGE = "#eadfce";
const HAIRLINE = "#f1e8d9";
const INK = "#2b2118";
const DEEP = "#43331f";
const MUTED = "#7a6a58";
const FAINT = "#9c8d7b";
const HEART = "#e0182d";
const ACCENT = "#b8860b";
const ACCENT_LIGHT = "#f2b64a";
const VALID_BG = "#e9f3ea";
const VALID_INK = "#2f6b3a";
const VALID_DOT = "#4c9a5e";
const PAST_BG = "#f3ece1";
const FONT = "Fraunces, Georgia, serif";

const HEARTS_PER_ROW = 10;
const HEART_GAP = 8;
const CHIP_HEIGHT = 40;

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

/** Coordinates to one decimal: the arithmetic is fractional, the file needn't be. */
function r(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Fraunces averages a little over half the em per character. Erring wide is
 * deliberate: the rasterizer draws every line at the font's heavy default
 * instance, wider than the browser's variable rendering, and a line that
 * overruns the card in the shared PNG is worse than one shrunk a step early.
 */
const WIDTH_PER_POINT = 0.57;

function estimateWidth(text: string, size: number): number {
  return text.length * size * WIDTH_PER_POINT;
}

/**
 * Shrink a line until it plausibly fits, and only then cut it. Names are the
 * one thing on this card that belongs to a person, so the card bends before it
 * truncates.
 */
function fitLine(text: string, maxWidth: number, preferred: number, min: number) {
  let size = preferred;
  while (size > min && estimateWidth(text, size) > maxWidth) size -= 2;
  const maxChars = Math.floor(maxWidth / (size * WIDTH_PER_POINT));
  const value = text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
  return { value, size };
}

interface TextOptions {
  size: number;
  fill: string;
  weight?: number;
  anchor?: "start" | "middle";
  letterSpacing?: number;
}

function textEl(x: number, y: number, value: string, options: TextOptions): string {
  const parts = [
    `x="${r(x)}"`,
    `y="${r(y)}"`,
    `font-family="${FONT}"`,
    `font-size="${r(options.size)}"`,
    `fill="${options.fill}"`,
  ];
  if (options.weight) parts.push(`font-weight="${options.weight}"`);
  if (options.anchor === "middle") parts.push('text-anchor="middle"');
  if (options.letterSpacing) parts.push(`letter-spacing="${options.letterSpacing}"`);
  return `<text ${parts.join(" ")}>${escapeXml(value)}</text>`;
}

/** A filled heart, drawn at (x, y) with the given box size. */
function heartPath(x: number, y: number, size: number, fill: string): string {
  const scale = size / 24;
  return `<path transform="translate(${r(x)} ${r(y)}) scale(${r(scale)})" fill="${fill}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`;
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
function heartGeometry(count: number, maxWidth: number) {
  if (count <= 0) return { rows: 0, size: 0, step: 0, height: 0 };
  const rows = Math.ceil(count / HEARTS_PER_ROW);
  // Fit ten across the column, then shrink again if the rows stack too deep.
  let size = Math.min(34, (maxWidth - HEART_GAP * (HEARTS_PER_ROW - 1)) / HEARTS_PER_ROW);
  if (rows > 3) size = Math.min(size, 22);
  const step = size + HEART_GAP;
  return { rows, size, step, height: rows * step - HEART_GAP };
}

/**
 * Draw the hearts, centred on `x` like every other line on the card. The last
 * row centres on its own width, so a part-full row does not hang.
 */
function heartRows(count: number, x: number, y: number, maxWidth: number): string {
  const { rows, size, step } = heartGeometry(count, maxWidth);
  if (rows === 0) return "";

  const shapes: string[] = [];
  for (let row = 0; row < rows; row++) {
    const inRow = Math.min(HEARTS_PER_ROW, count - row * HEARTS_PER_ROW);
    const rowWidth = inRow * step - HEART_GAP;
    const startX = x - rowWidth / 2;
    for (let column = 0; column < inRow; column++) {
      shapes.push(heartPath(startX + column * step, y + row * step, size, HEART));
    }
  }
  return shapes.join("");
}

/**
 * The validity, as a status chip rather than a line of prose: whether the
 * membership is current is the question the card exists to answer at a
 * glance, so it gets a shape of its own.
 */
function validityChip(x: number, y: number, text: string, lapsed: boolean): string {
  const size = 18;
  const width = estimateWidth(text, size) + 62;
  const left = x - width / 2;
  return `<rect x="${r(left)}" y="${r(y)}" width="${r(width)}" height="${CHIP_HEIGHT}" rx="${CHIP_HEIGHT / 2}" fill="${lapsed ? PAST_BG : VALID_BG}"/>
  <circle cx="${r(left + 24)}" cy="${r(y + CHIP_HEIGHT / 2)}" r="5" fill="${lapsed ? FAINT : VALID_DOT}"/>
  ${textEl(left + 40, y + CHIP_HEIGHT / 2 + 6.5, text, {
    size,
    weight: 600,
    fill: lapsed ? MUTED : VALID_INK,
  })}`;
}

/**
 * The QR code in a panel of its own, with its quiet zone built in. Cream
 * rather than white so the panel reads as an object on the card, and light
 * enough that a scanner still sees full contrast.
 */
function qrPanel(
  left: number,
  top: number,
  qrSize: number,
  qr: { path: string; moduleCount: number },
): string {
  const pad = 18;
  const panel = qrSize + pad * 2;
  return `<rect x="${r(left)}" y="${r(top)}" width="${r(panel)}" height="${r(panel)}" rx="22" fill="${CREAM}" stroke="${EDGE}" stroke-width="2"/>
  <g transform="translate(${r(left + pad)} ${r(top + pad)}) scale(${r(qrSize / qr.moduleCount)})"><path d="${qr.path}" fill="${INK}"/></g>`;
}

/** The card's frame: cream ground, white card, warm accent along its top edge. */
function frame(width: number, height: number, inner: number, radius: number): string {
  const w = width - inner * 2;
  const h = height - inner * 2;
  return `<defs>
    <linearGradient id="card-accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="0.55" stop-color="#e8a33c"/>
      <stop offset="1" stop-color="${HEART}"/>
    </linearGradient>
    <clipPath id="card-clip"><rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}"/></clipPath>
    <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#8a7355" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${CREAM}"/>
  <rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}" fill="${CARD}" filter="url(#card-shadow)"/>
  <rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}" fill="none" stroke="${EDGE}" stroke-width="2"/>`;
}

/**
 * The warm strip along the card's top edge — the one bit of the product's own
 * colour on a card that otherwise belongs to the organization. Drawn after the
 * identity band, which would otherwise cover it.
 */
function accentStrip(width: number, inner: number): string {
  return `<g clip-path="url(#card-clip)"><rect x="${inner}" y="${inner}" width="${width - inner * 2}" height="9" fill="url(#card-accent)"/></g>`;
}

/** The brand attribution, with its heart drawn rather than typed. */
function attribution(x: number, baseline: number): string {
  const size = 15;
  const label = "støttemedlem.no";
  const heartSize = 17;
  const gap = 9;
  const total = heartSize + gap + estimateWidth(label, size);
  const left = x - total / 2;
  return `${heartPath(left, baseline - heartSize + 2, heartSize, HEART)}
  ${textEl(left + heartSize + gap, baseline, label, { size, fill: FAINT })}`;
}

interface CardContent {
  memberName: string;
  orgName: string;
  hearts: number;
  scoreLabel: string;
  validity: string;
  lapsed: boolean;
  logoDataUri: string | null;
  qr: { path: string; moduleCount: number };
  alt: string;
}

/** The organization's mark, always in a circle — as everywhere else it is shown. */
function logoCircle(cx: number, cy: number, size: number, dataUri: string): string {
  return `<clipPath id="logo-circle"><circle cx="${r(cx)}" cy="${r(cy)}" r="${r(size / 2)}"/></clipPath>
  <circle cx="${r(cx)}" cy="${r(cy)}" r="${r(size / 2 + 3)}" fill="${CARD}" stroke="${EDGE}" stroke-width="2"/>
  <image x="${r(cx - size / 2)}" y="${r(cy - size / 2)}" width="${r(size)}" height="${r(size)}" href="${escapeXml(dataUri)}" clip-path="url(#logo-circle)" preserveAspectRatio="xMidYMid slice"/>`;
}

/**
 * The card: the content down the middle of the page, at sizes a thumb-width
 * screen can actually read and a camera can scan.
 */
function drawCard(content: CardContent): string {
  const width = MEMBER_CARD_WIDTH;
  const height = MEMBER_CARD_HEIGHT;
  const inner = 20;
  const pad = 40;
  const left = inner + pad;
  const right = width - inner - pad;
  const center = width / 2;
  const columnWidth = right - left;

  const hasLogo = Boolean(content.logoDataUri);
  const logoSize = 108;
  const bandHeight = hasLogo ? 254 : 156;
  const bandBottom = inner + bandHeight;
  const org = fitLine(content.orgName, columnWidth, 30, 17);

  const attributionBaseline = height - inner - 42;
  const ruleY = attributionBaseline - 42;
  const bodyTop = bandBottom;
  const bodyHeight = ruleY - bodyTop;

  const name = fitLine(content.memberName, columnWidth, 48, 26);
  const { height: heartsHeight } = heartGeometry(content.hearts, columnWidth);
  const scoreBlock = content.hearts > 0 ? 30 + heartsHeight + 10 + 20 : 0;
  const nameAdvance = name.size * 0.92;

  // Big enough that a phone held up to it scans first time, and no bigger —
  // past that the code takes the card away from the member, who is its point.
  const qrSize = 196;
  const panel = qrSize + 36;
  const qrCaptionOrg = fitLine(content.orgName, columnWidth, 15, 12);
  const qrBlockHeight = 40 + panel + 60;

  const blockHeight = nameAdvance + 16 + CHIP_HEIGHT + scoreBlock + qrBlockHeight;
  const blockTop = bodyTop + (bodyHeight - blockHeight) / 2;
  const chipY = blockTop + nameAdvance + 16;
  const heartsY = chipY + CHIP_HEIGHT + 30;
  const qrTop = chipY + CHIP_HEIGHT + scoreBlock + 40;

  return `${frame(width, height, inner, 32)}
  <g clip-path="url(#card-clip)"><rect x="${inner}" y="${inner}" width="${width - inner * 2}" height="${bandHeight}" fill="${BAND}"/></g>
  ${accentStrip(width, inner)}
  <line x1="${inner}" y1="${bandBottom}" x2="${width - inner}" y2="${bandBottom}" stroke="${EDGE}" stroke-width="2"/>
${hasLogo ? `  ${logoCircle(center, inner + 46 + logoSize / 2, logoSize, content.logoDataUri ?? "")}\n` : ""}  ${textEl(center, bandBottom - 78, "STØTTEMEDLEM", { size: 13, weight: 700, fill: ACCENT, letterSpacing: 3.2, anchor: "middle" })}
  ${textEl(center, bandBottom - 38, org.value, { size: org.size, weight: 600, fill: DEEP, anchor: "middle" })}

  ${textEl(center, blockTop + name.size * 0.74, name.value, { size: name.size, weight: 700, fill: INK, anchor: "middle" })}
  ${validityChip(center, chipY, content.validity, content.lapsed)}
${content.hearts > 0 ? `${heartRows(content.hearts, center, heartsY, columnWidth)}\n  ${textEl(center, heartsY + heartsHeight + 26, content.scoreLabel, { size: 17, fill: MUTED, anchor: "middle" })}\n` : ""}
  ${qrPanel(center - panel / 2, qrTop, qrSize, content.qr)}
  ${textEl(center, qrTop + panel + 34, "Skann og bli støttemedlem", { size: 17, weight: 600, fill: MUTED, anchor: "middle" })}
  ${textEl(center, qrTop + panel + 58, `i ${qrCaptionOrg.value}`, { size: qrCaptionOrg.size, fill: FAINT, anchor: "middle" })}

  <line x1="${left}" y1="${ruleY}" x2="${right}" y2="${ruleY}" stroke="${HAIRLINE}" stroke-width="2"/>
  ${attribution(center, attributionBaseline)}`;
}

export function memberCardSvg(options: MemberCardOptions): string {
  const hearts = Math.max(0, Math.floor(options.hearts));
  const recruits = Math.max(0, Math.floor(options.recruits ?? 0));
  const orgName = options.organizationName.trim();
  const memberName = options.memberName?.trim() || "Støttemedlem";
  const { width, height } = memberCardSize();

  const yearLabel = hearts === 1 ? "1 år som støttemedlem" : `${hearts} år som støttemedlem`;
  const recruitLabel =
    recruits > 0 ? ` · vervet ${recruits} ${recruits === 1 ? "medlem" : "medlemmer"}` : "";

  const content: CardContent = {
    memberName,
    orgName,
    hearts,
    scoreLabel: `${yearLabel}${recruitLabel}`,
    validity: options.lapsed
      ? `Støttet til og med ${options.periodText}`
      : `Gyldig medlemskap ${options.periodText}`,
    lapsed: Boolean(options.lapsed),
    logoDataUri: options.logoDataUri ?? null,
    qr: qrModulesPath(options.joinUrl),
    alt: `Medlemsbevis: ${memberName} er støttemedlem i ${orgName}, med ${hearts} hjerter.`,
  };

  const body = drawCard(content);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(content.alt)}">
  <title>${escapeXml(content.alt)}</title>
  ${body}
</svg>
`;
}
