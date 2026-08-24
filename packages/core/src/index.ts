/**
 * @stottemedlem/core — shared domain types and logic.
 *
 * This is the canonical example of a shared workspace package: pure TypeScript,
 * built to `dist/` with `tsc`, and consumed by apps via the `workspace:*`
 * protocol. Add more shared packages (e.g. `ui`, `utils`) alongside this one.
 */

// --- Membership tiers (specs/concepts/membership-tier.md) -------------------
//
// The product hosts the tier catalogue (Vipps has no product-catalogue API);
// each tier is projected onto every Vipps agreement created for it. The Vipps
// Recurring v3 limits below are from the OpenAPI spec and cap what a tier may
// carry, so a tier always projects losslessly.

/** Vipps Recurring v3: max length of an agreement's `productName`. */
export const VIPPS_PRODUCT_NAME_MAX_LENGTH = 45;
/** Vipps Recurring v3: max length of an agreement's `productDescription`. */
export const VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH = 100;
/** Vipps Recurring v3: max length of an agreement's `externalId`. */
export const VIPPS_EXTERNAL_ID_MAX_LENGTH = 64;

/**
 * Max length of a membership tier key. Chosen so the agreement externalId
 * convention (`<tierKey>:<membershipId>` with a UUID membership id) always
 * fits Vipps' 64-char `externalId` limit: 24 + 1 + 36 = 61.
 */
export const MEMBERSHIP_TIER_KEY_MAX_LENGTH = 24;

/**
 * The name of the minimal first membership every organization states at
 * creation (specs/concepts/membership-tier.md) — renameable afterwards.
 */
export const DEFAULT_MEMBERSHIP_TIER_NAME = "Støttemedlemskap";

/**
 * Max length of a tier's own description. Deliberately LONGER than Vipps'
 * `productDescription` (and multi-line): the description is written for the
 * organization's join page, and `vippsProductDescription` derives the
 * shorter single-line form the payment provider's field can hold.
 */
export const MEMBERSHIP_TIER_DESCRIPTION_MAX_LENGTH = 200;

/**
 * Clean up a pasted/typed tier description without narrowing what may be
 * written: any printable text is kept (Norwegian letters, punctuation, emoji);
 * only line endings are normalized, tabs become spaces, other control
 * characters are dropped, and runs of blank lines collapse to one.
 */
export function normalizeMembershipTierDescription(input: string): string {
  return input
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\t", " ")
    .replaceAll(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replaceAll(/ +\n/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The single-line form of a tier description that fits a Vipps agreement's
 * `productDescription`: line breaks and runs of whitespace collapse to single
 * spaces, and anything longer than the limit is cut at a word boundary with
 * an ellipsis. The full description stays on the join page.
 */
export function vippsProductDescription(description: string): string {
  const singleLine = description.replaceAll(/\s+/g, " ").trim();
  if (singleLine.length <= VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH) return singleLine;
  const cut = singleLine.slice(0, VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed =
    lastSpace > VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH / 2 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

/**
 * A membership tier's stable key, derived from its name when the tier is
 * created and never changed afterwards (renames change the name, not the key).
 * Unique within the organization — callers add a `-2`/`-3` suffix on collision.
 */
export function membershipTierKey(name: string): string {
  const key = slugify(name).slice(0, MEMBERSHIP_TIER_KEY_MAX_LENGTH).replace(/-+$/, "");
  return key || "medlemskap";
}

/**
 * The agreement `externalId` convention that ties a Vipps agreement back to
 * the tier it was created for (and the local membership record): the tier key,
 * a colon, then the membership id. Guaranteed to fit Vipps' 64-char limit for
 * UUID membership ids.
 */
export function tierAgreementExternalId(tierKey: string, membershipId: string): string {
  const externalId = `${tierKey}:${membershipId}`;
  if (externalId.length > VIPPS_EXTERNAL_ID_MAX_LENGTH) {
    throw new Error(`agreement externalId exceeds ${VIPPS_EXTERNAL_ID_MAX_LENGTH} chars`);
  }
  return externalId;
}

/** Recover the tier key from an agreement `externalId` written by the convention above. */
export function tierKeyFromAgreementExternalId(externalId: string): string | null {
  const colon = externalId.indexOf(":");
  return colon > 0 ? externalId.slice(0, colon) : null;
}

/**
 * Canonical public origin, punycode form of støttemedlem.no. Anything printed
 * or embedded off-site (QR payloads, embed snippets) must use this ASCII form —
 * a raw ø breaks some scanners/clients.
 */
export const CANONICAL_ORIGIN = "https://xn--stttemedlem-hgb.no";

/** Display form of the canonical origin, for UI copy only. */
export const CANONICAL_ORIGIN_DISPLAY = "https://støttemedlem.no";

/** URL-safe slug from Norwegian text: lowercase ASCII words joined by hyphens. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

/** URL-safe slug from an organization's public name (Norwegian-aware). */
export function slugifyOrganizationName(name: string): string {
  const slug = slugify(name).slice(0, 63);
  return slug || "min-organisasjon";
}

/**
 * The path segment every public organization page lives under
 * (specs/concepts/join-page.md). Norwegian "bli medlem" — the address reads as
 * a sentence with the slug appended: /bli-medlem/nordnes-skolekorps.
 * Route matching in the Worker and the middleware derive from this.
 */
export const JOIN_PAGE_PATH_SEGMENT = "bli-medlem";

/** The join page's path on the canonical origin, e.g. `/bli-medlem/<slug>`. */
export function joinPagePath(slug: string): string {
  return `/${JOIN_PAGE_PATH_SEGMENT}/${slug}`;
}

/**
 * The organization's join page (see specs/concepts/join-page.md) — the single
 * public address an organization has: what it spreads as a link and as a
 * QR code, and what an administrator pastes into forms that ask for "your
 * website". Must never change once printed; what the page shows behind it can.
 * The shareable address is always the bare URL — the product offers no
 * per-membership link. The optional tier key (`?medlemskap=<tierKey>`) only
 * carries the choice a supporter already made on the page onward into joining.
 */
export function joinPageUrl(slug: string, tierKey?: string): string {
  const url = `${CANONICAL_ORIGIN}${joinPagePath(slug)}`;
  return tierKey ? `${url}?medlemskap=${encodeURIComponent(tierKey)}` : url;
}

/**
 * The organization's standard sales-terms (salgsvilkår) page, linked from the
 * join page. The second URL the payment provider verifies.
 */
export function joinPageTermsUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}${joinPagePath(slug)}/vilkar`;
}

/**
 * Validate a Norwegian organisasjonsnummer: 9 digits with a MOD11 check digit
 * (weights 3,2,7,6,5,4,3,2). Accepts digits with optional spaces.
 */
/** Display form of an organisasjonsnummer: "923609016" → "923 609 016". */
export function formatOrganisasjonsnummer(orgnr: string): string {
  const digits = orgnr.replaceAll(" ", "");
  if (!/^\d{9}$/.test(digits)) return orgnr;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function isValidOrganisasjonsnummer(input: string): boolean {
  const digits = input.replaceAll(" ", "");
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  const control = remainder === 0 ? 0 : 11 - remainder;
  if (control === 10) return false;
  return control === Number(digits[8]);
}

// ── Annual period (specs/concepts/annual-period.md) ─────────────────────────

/**
 * The stretch of time one membership covers: the calendar year. Every
 * membership in every organization ends 31 December, so "our supporting
 * members in 2027" is a single answerable question.
 */
export interface AnnualPeriod {
  /** The calendar year the membership belongs to. */
  year: number;
  /** First day covered, `YYYY-MM-DD`: the join date, or 1 January on renewal. */
  start: string;
  /** Always 31 December of `year`. */
  end: string;
}

/** `YYYY-MM-DD` in UTC — periods are calendar dates, never instants. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * The period a membership taken out on `on` belongs to: it runs from that day
 * (the join) to 31 December. A renewal's period starts 1 January, which is
 * what this returns for a 1 January date.
 */
export function annualPeriodFor(on: Date = new Date()): AnnualPeriod {
  const year = on.getUTCFullYear();
  return { year, start: isoDate(on), end: `${year}-12-31` };
}

/** The next period, whole and starting 1 January — what a renewal buys. */
export function nextAnnualPeriod(period: AnnualPeriod): AnnualPeriod {
  const year = period.year + 1;
  return { year, start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Whole days from `on` (counted) through 31 December of its year. */
export function daysRemainingInYear(on: Date = new Date()): number {
  const year = on.getUTCFullYear();
  const startOfJoinDay = Date.UTC(year, on.getUTCMonth(), on.getUTCDate());
  const startOfNextYear = Date.UTC(year + 1, 0, 1);
  return (startOfNextYear - startOfJoinDay) / 86_400_000;
}

/**
 * What joining on `on` costs: the share of the tier's annual fee matching the
 * part of the calendar year that remains, so nobody pays a full year for a
 * part of one (specs/concepts/annual-fee.md). Joining 1 January costs the full
 * fee; the amount never rounds below 1 kr, because a payment of nothing cannot
 * be collected.
 *
 * Renewals always cost the full fee — this is for the first, partial period.
 */
export function proratedJoinFeeNok(annualFeeNok: number, on: Date = new Date()): number {
  const share = daysRemainingInYear(on) / daysInYear(on.getUTCFullYear());
  const prorated = Math.round(annualFeeNok * share);
  return Math.min(annualFeeNok, Math.max(1, prorated));
}

/**
 * When next year's renewal payment is arranged. The payment provider shows a
 * member an upcoming charge about 35 days ahead, so arranging renewals from
 * the start of December gives them the full visibility window before New Year
 * — and leaves the organization a month in which a fee change can still reach
 * that renewal (specs/use-cases/change-the-annual-fee.md).
 */
export const RENEWAL_ARRANGED_FROM = { month: 12, day: 1 } as const;

/** Whether renewals for the coming period should already have been arranged. */
export function isRenewalWindow(today: Date = new Date()): boolean {
  const month = today.getUTCMonth() + 1;
  return (
    month > RENEWAL_ARRANGED_FROM.month ||
    (month === RENEWAL_ARRANGED_FROM.month && today.getUTCDate() >= RENEWAL_ARRANGED_FROM.day)
  );
}

/** The period a renewal arranged today pays for: always the next calendar year. */
export function renewalPeriodYear(today: Date = new Date()): number {
  return today.getUTCFullYear() + 1;
}

/**
 * A UUID that is always the same for the same seed — how a retry asks the
 * payment provider for *that* payment again rather than for another one.
 *
 * A job that creates a payment and then fails to write it down would, on its
 * next run, see no payment and create a second. Deriving the retry key from
 * the thing being paid for (this agreement, this period) makes the second
 * attempt land on the first payment instead of beside it.
 */
export async function stableUuid(seed: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  const bytes = Array.from(new Uint8Array(digest).slice(0, 16));
  // RFC 4122 version and variant bits, so providers that validate the shape
  // (Vipps does) accept it as a UUID.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
