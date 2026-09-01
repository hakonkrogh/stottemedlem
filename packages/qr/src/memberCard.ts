/**
 * The member's card (specs/concepts/member-card.md) — a supporting member's
 * proof that they back an organization, drawn as one self-contained SVG.
 *
 * One drawing, every surface: it is what the member sees on their own page,
 * what a social feed previews when they share the address, and (rasterized)
 * what rides along with their receipt. Keeping it a single artifact is the
 * point — the card someone shares must be the card they were shown.
 *
 * The layout (chosen 2026-09-01 from a field study of wallet passes, badges
 * and streak cards): an identity band across the top — the organization's
 * logo and name on the left, the validity as a label-over-year corner on the
 * right — then the member's name large, their years as a count inside one big
 * heart (the streak), a celebratory line, the QR code, and the attribution.
 * The card stays colour-neutral cream and ink so any organization's logo sits
 * comfortably in the band; the heart red is the one strong colour.
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
 * centres the stack, so a first-year member and a decade-long one both get a
 * balanced card instead of one with a hole in it.
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

/** The canvas behind the card — a step deeper than the card so it reads as an object. */
const GROUND = "#f2e9d8";
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
/** The heart of a lapsed card: still there, no longer cheering. */
const HEART_PAST = "#c9ab9e";
const ACCENT = "#b8860b";
const VALID_INK = "#2f6b3a";
/**
 * The stack a browser resolves when it draws the SVG itself: "Fraunces" is
 * the rasterizer's embedded face; "Fraunces Variable" is the same family as
 * the website loads (packages/ui tokens), so an inline card matches the
 * shipped PNG instead of falling back to Georgia.
 */
const FONT = "Fraunces, 'Fraunces Variable', Georgia, serif";

export interface MemberCardOptions {
  /** The member's own name; falls back to a neutral label when unknown. */
  memberName?: string | null;
  organizationName: string;
  /** Supported annual periods — the count shown inside the streak heart (specs/concepts/scorecard.md). */
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
 * Fraunces averages a little over half the em per character. The estimate was
 * calibrated against the font's Black cut and kept after the embedded face
 * became the brand's 650 cut (2026-09-01, narrower): erring wide is
 * deliberate, because a line that overruns the card in the shared PNG is
 * worse than one shrunk a step early.
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
  anchor?: "start" | "middle" | "end";
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
  if (options.anchor && options.anchor !== "start") parts.push(`text-anchor="${options.anchor}"`);
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
 * The streak: the member's years as a number inside one big heart — the brand
 * mark carrying the count, rather than a heart per year
 * (specs/concepts/scorecard.md). The number's ink box centres at 0.47 of the
 * heart's box — the shape's optical middle, tuned by eye between its red
 * centroid (0.433, measured from a rendered card; reads high for a wide
 * two-digit number) and its ink midpoint (0.51; reads low, the lobes carry
 * the mass). Fraunces digits span roughly 0 to 0.72 em, so half their ink
 * height is ~0.36 of the font size.
 */
function streakHeart(
  cx: number,
  top: number,
  size: number,
  count: number,
  lapsed: boolean,
): string {
  const digits = String(count).length;
  const numberSize = size * (digits >= 2 ? 0.3 : 0.4);
  const baseline = top + size * 0.47 + numberSize * 0.36;
  return `${heartPath(cx - size / 2, top, size, lapsed ? HEART_PAST : HEART)}
  ${textEl(cx, baseline, String(count), { size: numberSize, weight: 650, fill: CARD, anchor: "middle" })}`;
}

/**
 * The validity as a wallet-pass corner: a small label over the year, in the
 * band's top right — the one thing you check, in a fixed place. A lapsed card
 * still tells the truth, just without the green.
 */
function validityCorner(rightX: number, centerY: number, periodText: string, lapsed: boolean) {
  const label = lapsed ? "STØTTET T.O.M." : "GYLDIG";
  const labelSize = 13;
  const valueSize = 27;
  // letter-spacing widens the label beyond the plain estimate.
  const width = Math.max(
    estimateWidth(label, labelSize) + label.length * 2.4,
    estimateWidth(periodText, valueSize),
  );
  const markup = `${textEl(rightX, centerY - 8, label, {
    size: labelSize,
    weight: 650,
    fill: FAINT,
    letterSpacing: 2.4,
    anchor: "end",
  })}
  ${textEl(rightX, centerY + 22, periodText, {
    size: valueSize,
    weight: 650,
    fill: lapsed ? MUTED : VALID_INK,
    anchor: "end",
  })}`;
  return { markup, width };
}

/**
 * The QR code in a panel of its own, with its quiet zone built in. White on
 * the cream card, so the panel is the brightest thing on it — an object a
 * scanner gets full contrast from and an eye finds first.
 */
function qrPanel(
  left: number,
  top: number,
  qrSize: number,
  qr: { path: string; moduleCount: number },
): string {
  const pad = 18;
  const panel = qrSize + pad * 2;
  return `<rect x="${r(left)}" y="${r(top)}" width="${r(panel)}" height="${r(panel)}" rx="22" fill="${CARD}" stroke="${EDGE}" stroke-width="2"/>
  <g transform="translate(${r(left + pad)} ${r(top + pad)}) scale(${r(qrSize / qr.moduleCount)})"><path d="${qr.path}" fill="${INK}"/></g>`;
}

/** The card's frame: a warm ground, the cream card, a hairline edge and a soft shadow. */
function frame(width: number, height: number, inner: number, radius: number): string {
  const w = width - inner * 2;
  const h = height - inner * 2;
  return `<defs>
    <clipPath id="card-clip"><rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}"/></clipPath>
    <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#8a7355" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${GROUND}"/>
  <rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}" fill="${CREAM}" filter="url(#card-shadow)"/>
  <rect x="${inner}" y="${inner}" width="${w}" height="${h}" rx="${radius}" fill="none" stroke="${EDGE}" stroke-width="2"/>`;
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
  headline: string;
  recruitLine: string | null;
  periodText: string;
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
 * The card: an identity band across the top, then the member down the middle
 * of the page, at sizes a thumb-width screen can actually read and a camera
 * can scan.
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

  // The band: logo and organization on the left, validity in the corner.
  const bandHeight = 128;
  const bandBottom = inner + bandHeight;
  const bandCenter = inner + bandHeight / 2;
  const hasLogo = Boolean(content.logoDataUri);
  const logoSize = 76;
  const corner = validityCorner(right, bandCenter, content.periodText, content.lapsed);
  const orgLeft = hasLogo ? left + logoSize + 22 : left;
  const org = fitLine(content.orgName, right - corner.width - 28 - orgLeft, 30, 16);

  const attributionBaseline = height - inner - 42;
  const ruleY = attributionBaseline - 42;
  const bodyTop = bandBottom;
  const bodyHeight = ruleY - bodyTop;

  const name = fitLine(content.memberName, columnWidth, 48, 26);
  const nameAdvance = name.size * 0.92;

  const heartSize = 176;
  const headline = content.hearts > 0 ? fitLine(content.headline, columnWidth, 32, 22) : null;
  // Heart, headline, and the recruit line under it — absent entirely at zero.
  const streakBlock = headline
    ? heartSize + 10 + headline.size + (content.recruitLine ? 34 : 0) + 34
    : 0;

  // Big enough that a phone held up to it scans first time, and no bigger —
  // past that the code takes the card away from the member, who is its point.
  const qrSize = 196;
  const panel = qrSize + 36;
  const qrCaptionOrg = fitLine(`i ${content.orgName}`, columnWidth, 15, 12);
  const qrBlockHeight = panel + 60;

  const roleAdvance = 15;
  const blockHeight = roleAdvance + 18 + nameAdvance + 30 + streakBlock + qrBlockHeight;
  const blockTop = bodyTop + (bodyHeight - blockHeight) / 2;

  const roleBaseline = blockTop + roleAdvance;
  const nameBaseline = roleBaseline + 18 + name.size * 0.74;
  const heartTop = roleBaseline + 18 + nameAdvance + 30;
  const headlineBaseline = heartTop + heartSize + 10 + (headline?.size ?? 0) * 0.74;
  const recruitBaseline = headlineBaseline + 34;
  const qrTop = blockTop + roleAdvance + 18 + nameAdvance + 30 + streakBlock;

  return `${frame(width, height, inner, 32)}
  <g clip-path="url(#card-clip)"><rect x="${inner}" y="${inner}" width="${width - inner * 2}" height="${bandHeight}" fill="${BAND}"/></g>
  <line x1="${inner}" y1="${bandBottom}" x2="${width - inner}" y2="${bandBottom}" stroke="${EDGE}" stroke-width="2"/>
${hasLogo ? `  ${logoCircle(left + logoSize / 2, bandCenter, logoSize, content.logoDataUri ?? "")}\n` : ""}  ${textEl(orgLeft, bandCenter + org.size * 0.35, org.value, { size: org.size, weight: 650, fill: DEEP })}
  ${corner.markup}

  ${textEl(center, roleBaseline, "STØTTEMEDLEM", { size: 15, weight: 650, fill: ACCENT, letterSpacing: 3.6, anchor: "middle" })}
  ${textEl(center, nameBaseline, name.value, { size: name.size, weight: 650, fill: INK, anchor: "middle" })}
${
  headline
    ? `  ${streakHeart(center, heartTop, heartSize, content.hearts, content.lapsed)}
  ${textEl(center, headlineBaseline, headline.value, { size: headline.size, weight: 650, fill: content.lapsed ? MUTED : DEEP, anchor: "middle" })}
${content.recruitLine ? `  ${textEl(center, recruitBaseline, content.recruitLine, { size: 20, fill: MUTED, anchor: "middle" })}\n` : ""}`
    : ""
}
  ${qrPanel(center - panel / 2, qrTop, qrSize, content.qr)}
  ${textEl(center, qrTop + panel + 34, "Skann og bli støttemedlem", { size: 17, weight: 650, fill: MUTED, anchor: "middle" })}
  ${textEl(center, qrTop + panel + 58, qrCaptionOrg.value, { size: qrCaptionOrg.size, fill: FAINT, anchor: "middle" })}

  <line x1="${left}" y1="${ruleY}" x2="${right}" y2="${ruleY}" stroke="${HAIRLINE}" stroke-width="2"/>
  ${attribution(center, attributionBaseline)}`;
}

export function memberCardSvg(options: MemberCardOptions): string {
  const hearts = Math.max(0, Math.floor(options.hearts));
  const recruits = Math.max(0, Math.floor(options.recruits ?? 0));
  const orgName = options.organizationName.trim();
  const memberName = options.memberName?.trim() || "Støttemedlem";
  const lapsed = Boolean(options.lapsed);
  const { width, height } = memberCardSize();

  const content: CardContent = {
    memberName,
    orgName,
    hearts,
    // The exclamation mark is the card cheering; a lapsed card stays factual.
    headline: `${hearts} år som støttemedlem${lapsed ? "" : "!"}`,
    recruitLine:
      recruits > 0 ? `Vervet ${recruits} ${recruits === 1 ? "medlem" : "medlemmer"}` : null,
    periodText: options.periodText,
    lapsed,
    logoDataUri: options.logoDataUri ?? null,
    qr: qrModulesPath(options.joinUrl),
    alt: `Medlemsbevis: ${memberName} er støttemedlem i ${orgName}${
      hearts > 0 ? ` på ${hearts}. året` : ""
    }, ${lapsed ? `støttet til og med ${options.periodText}` : `gyldig ${options.periodText}`}.`,
  };

  const body = drawCard(content);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(content.alt)}">
  <title>${escapeXml(content.alt)}</title>
  <style>text{font-variation-settings:'SOFT' 50}</style>
  ${body}
</svg>
`;
}
