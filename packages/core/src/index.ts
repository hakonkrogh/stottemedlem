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
  return (
    input
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .replaceAll("\t", " ")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: dropping control characters is this function's job (see the doc comment); the range spares \n, which the lines above normalize to.
      .replaceAll(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
      .replaceAll(/ +\n/g, "\n")
      .replaceAll(/\n{3,}/g, "\n\n")
      .trim()
  );
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

/**
 * The data processing agreement between an organization and the product
 * (specs/concepts/data-processing-agreement.md) — one standard text, public so
 * it can be read before signing up and re-read afterwards.
 */
export const DPA_PATH = "/databehandleravtale";

/**
 * Which version of that text is current. Dated rather than numbered, because
 * what an organization needs to know is *when* the terms it accepted were
 * written. Change this when the agreement changes in substance, and every
 * organization is asked to accept the new one; leave it alone for typos.
 */
export const DPA_VERSION = "2026-08-31";

/** The join page's path on the canonical origin, e.g. `/bli-medlem/<slug>`. */
export function joinPagePath(slug: string): string {
  return `/${JOIN_PAGE_PATH_SEGMENT}/${slug}`;
}

/** The sales-terms page's path, beneath the join page: `/bli-medlem/<slug>/vilkar`. */
export function joinPageTermsPath(slug: string): string {
  return `${joinPagePath(slug)}/vilkar`;
}

/**
 * The privacy notice's path, beneath the join page:
 * `/bli-medlem/<slug>/personvern`. A supporter must be able to read what is
 * collected about them, and why, BEFORE they leave for the payment app — so
 * this address is reachable from the join page rather than only afterwards
 * (specs/concepts/member-data.md).
 */
export function joinPagePrivacyPath(slug: string): string {
  return `${joinPagePath(slug)}/personvern`;
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
  return `${CANONICAL_ORIGIN}${joinPageTermsPath(slug)}`;
}

/**
 * The member's own page for one membership (see
 * specs/concepts/member-self-service.md) — where they see what they pay and
 * can stop it. The token is the whole of its security: it stands in for a
 * login, so this address only ever goes to the member, through their payment
 * app or a notice addressed to them.
 */
export function memberSelfServicePath(slug: string, manageToken: string): string {
  return `${joinPagePath(slug)}/min-side?n=${encodeURIComponent(manageToken)}`;
}

/**
 * The path segment a member's card lives under
 * (specs/concepts/member-card.md). Norwegian "medlemsbevis" — proof of
 * membership. It sits at the top level rather than beneath the organization:
 * the card is the member's own object, and a short address is what makes it
 * shareable.
 */
export const MEMBER_CARD_PATH_SEGMENT = "medlemsbevis";

/**
 * A member's card — the address they may share with anyone
 * (specs/concepts/member-card.md). The token identifies the card and grants
 * nothing but looking at it, which is exactly what separates it from
 * `memberSelfServicePath`: that one can end the membership and must never be
 * shared.
 */
export function memberCardPath(cardToken: string): string {
  return `/${MEMBER_CARD_PATH_SEGMENT}/${encodeURIComponent(cardToken)}`;
}

/**
 * The card's image, beneath its page: what every surface embeds and what a
 * social feed previews. There is only one card (specs/concepts/member-card.md),
 * so this address takes no shape — the `?form=staaende` parameter that used to
 * ask for an upright variant is gone, and an old link carrying it simply gets
 * the card.
 */
export function memberCardImagePath(cardToken: string, format: "png" | "svg" = "png"): string {
  return `${memberCardPath(cardToken)}/kort.${format}`;
}

/**
 * The query parameter carrying a referral into the join page
 * (specs/concepts/member-card.md): the card token of the member whose card was
 * scanned. Norwegian "verva" — recruited.
 */
export const JOIN_REFERRAL_PARAM = "verva";

/**
 * The join page as a member's card advertises it: the organization's ordinary
 * join address with the referral attached, so a completed join can be credited
 * back to the member who handed the card on
 * (specs/use-cases/earn-hearts-and-recruit.md).
 */
export function referredJoinPath(slug: string, cardToken: string): string {
  return `${joinPagePath(slug)}?${JOIN_REFERRAL_PARAM}=${encodeURIComponent(cardToken)}`;
}

/**
 * A CSV document the way desktop spreadsheet tools actually open it
 * (specs/use-cases/export-member-list.md): semicolon-delimited (what Excel
 * expects under a Norwegian locale), CRLF line ends, and a UTF-8 BOM so æøå
 * survive a double-click. Values with delimiters, quotes or line breaks are
 * quoted; everything else is written as-is.
 */
export function csvDocument(rows: readonly (readonly (string | number | null)[])[]): string {
  const field = (value: string | number | null): string => {
    const text = value === null ? "" : String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return `\uFEFF${rows.map((row) => row.map(field).join(";")).join("\r\n")}\r\n`;
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

// ── Period schemes (specs/concepts/annual-period.md) ────────────────────────
//
// Production's annual period is the calendar year. The staging environment
// runs the same product on a compressed calendar — the ISO week as the
// "year" — so a full membership lifecycle (join, notice, reprice, renewal,
// lapse) can be rehearsed against the payment provider's test environment in
// days instead of years. Which scheme applies is environment configuration
// (PERIOD_SCHEME); everything downstream asks the scheme instead of the
// calendar directly.

/**
 * How the product counts periods in one environment: what "the year" is, when
 * renewals are arranged, and how long the real-time rules that surround
 * payments run. All durations are REAL days — the payment provider's clocks
 * (charge due dates, retries) never compress.
 */
export interface PeriodScheme {
  name: "calendar-year" | "iso-week";
  /** The period a membership taken out on `on` belongs to (start = join day). */
  periodFor(on?: Date): AnnualPeriod;
  /** The whole period behind a key, first day to last. */
  fullPeriod(key: number): AnnualPeriod;
  /** The key of the period after `key`. */
  nextPeriodKey(key: number): number;
  /** The key of the period a renewal arranged around now pays for. */
  renewalPeriodKey(today?: Date): number;
  /** Whether renewals for the coming period should already have been arranged. */
  isRenewalWindow(today?: Date): boolean;
  /** What joining on `on` costs: the fee, pro-rated over the period's remainder. */
  proratedJoinFeeNok(annualFeeNok: number, on?: Date): number;
  /** The cadence the payment agreement is created with. */
  agreementInterval: { unit: "YEAR" | "WEEK"; count: 1 };
  /** How many REAL days the provider retries a failed renewal charge. */
  retryDays: number;
  /** How long (REAL days, may be fractional) a member must have known a new fee. */
  feeNoticeDays: number;
  /** Reconciliation: how far back (REAL days) an unresolved payment is chased. */
  chargeLookbackDays: number;
  /** Reconciliation: how long (REAL days) an unapproved draft is worth asking about. */
  draftLookbackDays: number;
}

export const calendarYearScheme: PeriodScheme = {
  name: "calendar-year",
  periodFor: annualPeriodFor,
  fullPeriod: (key) => ({ year: key, start: `${key}-01-01`, end: `${key}-12-31` }),
  nextPeriodKey: (key) => key + 1,
  renewalPeriodKey: renewalPeriodYear,
  isRenewalWindow,
  proratedJoinFeeNok,
  agreementInterval: { unit: "YEAR", count: 1 },
  retryDays: 7,
  feeNoticeDays: 14,
  chargeLookbackDays: 60,
  draftLookbackDays: 14,
};

/** Monday-based day of week, 1 (Monday) – 7 (Sunday), in UTC. */
function isoWeekday(date: Date): number {
  return date.getUTCDay() || 7;
}

/** The Monday starting the ISO week `date` falls in, at UTC midnight. */
function mondayOf(date: Date): Date {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(day - (isoWeekday(date) - 1) * 86_400_000);
}

/**
 * The ISO week `date` falls in, encoded as one comparable number:
 * `isoYear * 100 + week` (2026-08-27 → 202635). Keys order chronologically —
 * week 1 of the new ISO year sorts after week 52/53 of the old — so they slot
 * into every place a calendar year goes, including the period_year column.
 */
export function isoWeekKey(date: Date): number {
  // The ISO year is the calendar year of the week's Thursday.
  const thursday = new Date(mondayOf(date).getTime() + 3 * 86_400_000);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(
    mondayOf(new Date(Date.UTC(isoYear, 0, 4))).getTime() + 3 * 86_400_000,
  );
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return isoYear * 100 + week;
}

/** The Monday starting the week behind an ISO week key. */
function mondayOfKey(key: number): Date {
  const isoYear = Math.floor(key / 100);
  const week = key % 100;
  // 4 January is always in week 1.
  const week1Monday = mondayOf(new Date(Date.UTC(isoYear, 0, 4)));
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 86_400_000);
}

const isoWeekPeriod = (key: number): AnnualPeriod => {
  const monday = mondayOfKey(key);
  return {
    year: key,
    start: isoDate(monday),
    end: isoDate(new Date(monday.getTime() + 6 * 86_400_000)),
  };
};

// One accelerated day is 7/365 of a real one; durations defined in days scale
// by the same ratio, except where the provider's own real-time rules put a
// floor under them (a charge's due date must be ≥1 real day out, retries run
// in real days).
const WEEK_AS_YEAR = 7 / 365;

export const isoWeekScheme: PeriodScheme = {
  name: "iso-week",
  periodFor: (on = new Date()) => {
    const key = isoWeekKey(on);
    return { year: key, start: isoDate(on), end: isoWeekPeriod(key).end };
  },
  fullPeriod: isoWeekPeriod,
  nextPeriodKey: (key) => isoWeekKey(new Date(mondayOfKey(key).getTime() + 7 * 86_400_000)),
  renewalPeriodKey: (today = new Date()) =>
    isoWeekKey(new Date(mondayOf(today).getTime() + 7 * 86_400_000)),
  // From Saturday: the provider requires a charge's due date ≥1 real day in
  // the future, so the accelerated "December" (~13 hours) cannot hold the
  // renewal — the window opens two real days before the week turns instead.
  isRenewalWindow: (today = new Date()) => isoWeekday(today) >= 6,
  proratedJoinFeeNok: (annualFeeNok, on = new Date()) => {
    const remaining = 8 - isoWeekday(on);
    const prorated = Math.round((annualFeeNok * remaining) / 7);
    return Math.min(annualFeeNok, Math.max(1, prorated));
  },
  agreementInterval: { unit: "WEEK", count: 1 },
  retryDays: 1,
  feeNoticeDays: 14 * WEEK_AS_YEAR,
  chargeLookbackDays: 2,
  draftLookbackDays: 1,
};

/**
 * The scheme an environment runs on. Unset means production's calendar year;
 * anything else must name a scheme, loudly — a typo silently falling back to
 * the calendar year would arrange real renewals a year out on staging.
 */
export function getPeriodScheme(name?: string): PeriodScheme {
  if (!name || name === "calendar-year") return calendarYearScheme;
  if (name === "iso-week") return isoWeekScheme;
  throw new Error(`unknown PERIOD_SCHEME "${name}"`);
}

/**
 * A period key as people read it: a calendar year as itself ("2026"), an ISO
 * week key as the week ("uke 35/2026"). Derivable from the key's shape alone,
 * so screens can label periods without knowing which scheme wrote them.
 */
export function periodLabel(key: number): string {
  return key > 9999 ? `uke ${key % 100}/${Math.floor(key / 100)}` : String(key);
}

// ── Refunds (specs/use-cases/refund-a-payment.md) ─────────────────────────

/**
 * How long after capture the payment provider still allows a refund. Real
 * days, not period-scheme days: this is Vipps' rule about money, so the
 * accelerated staging calendar does not shorten it with everything else.
 *
 * Uncomfortably tight for a yearly membership — last year's payment leaves the
 * window at almost exactly the moment this year's renewal is taken.
 */
export const REFUND_WINDOW_DAYS = 365;

/** Why a payment cannot be given back — each one a truthful thing to show. */
export type RefundRefusal = "not-captured" | "already-refunded" | "too-old";

/** What deciding on a refund needs to know about a recorded payment. */
export interface RefundablePayment {
  status: string;
  /** When the money was actually taken; null while it never was. */
  capturedAt: string | null;
}

/**
 * Whether a payment can still be given back, from what has been recorded — so
 * the back office offers refunding only where it is real, and says why where
 * it is not, instead of failing when pressed.
 */
export function refundRefusal(
  payment: RefundablePayment,
  now: Date = new Date(),
): RefundRefusal | null {
  if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
    return "already-refunded";
  }
  if (payment.status !== "CHARGED" || !payment.capturedAt) return "not-captured";
  const sinceCapture = (now.getTime() - new Date(payment.capturedAt).getTime()) / 86_400_000;
  return sinceCapture > REFUND_WINDOW_DAYS ? "too-old" : null;
}

/**
 * What became of a payment, in the terms an administrator thinks in: the
 * provider's ten statuses collapsed to the outcomes worth telling apart on a
 * member's page — it stands, it went back, some of it went back, it is on its
 * way, or it never happened.
 */
export type PaymentState = "paid" | "refunded" | "partly-refunded" | "pending" | "failed";

export function paymentState(status: string): PaymentState {
  switch (status) {
    case "CHARGED":
    case "PARTIALLY_CAPTURED":
      return "paid";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partly-refunded";
    case "FAILED":
    case "CANCELLED":
      return "failed";
    default:
      return "pending";
  }
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

// ── A join onto a period already paid for (specs/use-cases/join-as-supporting-member.md) ──

/**
 * What to do about money that arrived for a period the supporter already
 * holds — and, when it can be told apart, about the arrangement that sent it.
 *
 * - `refund` — give the payment back and leave the arrangement running. This
 *   is the supporter who ended their arrangement and joined again inside a
 *   period they had already paid for: continuing is exactly what they came
 *   for, and Vipps cannot revive a stopped agreement, so the new one is how
 *   their renewal comes back. Only the second payment for one period is wrong.
 * - `refund-and-stop` — give it back and end the arrangement too, because
 *   another one of theirs still runs. Two live arrangements for one supporter
 *   is not a duplicate payment yet; it is next period's, promised.
 */
export type RedundantJoinAction = "refund" | "refund-and-stop";

/** What deciding about a redundant payment needs to know. */
export interface RedundantJoinInput {
  /** The payment's status at the provider. Only captured money can be given back. */
  chargeStatus: string;
  /** The arrangement that made this payment. */
  agreementId: string;
  /**
   * The arrangement whose payment established the period's membership — null
   * when that is not recorded, which is never grounds to move anyone's money.
   */
  periodBoughtByAgreementId: string | null;
  /** Does the supporter hold some OTHER arrangement that still runs? */
  otherAgreementRunning: boolean;
}

/**
 * Whether a captured payment bought nothing, and what follows from that.
 *
 * A supporting member pays for an annual period once. When a payment lands
 * on a period whose membership another arrangement already bought, the money
 * bought nothing — the product gives it back rather than keeping it and
 * counting on somebody noticing (seen on staging 31.8.2026: a supporter who
 * cancelled and joined again the same day paid 400 kr twice for one period,
 * and both payments settled quietly onto the one membership).
 *
 * Null means there is nothing to undo: the payment established the period
 * itself, or no money was taken.
 */
export function redundantJoinAction(input: RedundantJoinInput): RedundantJoinAction | null {
  if (input.chargeStatus !== "CHARGED") return null;
  if (!input.periodBoughtByAgreementId) return null;
  if (input.periodBoughtByAgreementId === input.agreementId) return null;
  return input.otherAgreementRunning ? "refund-and-stop" : "refund";
}
