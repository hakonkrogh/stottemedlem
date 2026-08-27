import { describe, expect, it } from "vitest";
import {
  annualPeriodFor,
  calendarYearScheme,
  daysInYear,
  daysRemainingInYear,
  formatOrganisasjonsnummer,
  getPeriodScheme,
  isoWeekKey,
  isoWeekScheme,
  isRenewalWindow,
  isValidOrganisasjonsnummer,
  joinPagePath,
  joinPageTermsPath,
  joinPageTermsUrl,
  joinPageUrl,
  MEMBERSHIP_TIER_KEY_MAX_LENGTH,
  membershipTierKey,
  memberUnsubscribePath,
  nextAnnualPeriod,
  normalizeMembershipTierDescription,
  periodLabel,
  proratedJoinFeeNok,
  renewalPeriodYear,
  slugifyOrganizationName,
  stableUuid,
  tierAgreementExternalId,
  tierKeyFromAgreementExternalId,
  VIPPS_EXTERNAL_ID_MAX_LENGTH,
  VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH,
  vippsProductDescription,
} from "./index.js";

describe("normalizeMembershipTierDescription", () => {
  it("normalizes line endings and keeps intentional line breaks", () => {
    expect(normalizeMembershipTierDescription("Første linje\r\nAndre linje")).toBe(
      "Første linje\nAndre linje",
    );
    expect(normalizeMembershipTierDescription("A\n\n\n\nB")).toBe("A\n\nB");
  });

  it("keeps Norwegian letters, punctuation and emoji, drops control characters", () => {
    expect(normalizeMembershipTierDescription("Æ, ø & å — «sitat» 100 % 🎺")).toBe(
      "Æ, ø & å — «sitat» 100 % 🎺",
    );
    expect(normalizeMembershipTierDescription("ren\u0000tekst\u0007")).toBe("rentekst");
  });

  it("trims trailing spaces before line breaks and around the text", () => {
    expect(normalizeMembershipTierDescription("  A   \nB  ")).toBe("A\nB");
    expect(normalizeMembershipTierDescription("A\tB")).toBe("A B");
  });
});

describe("vippsProductDescription", () => {
  it("flattens line breaks into a single line", () => {
    expect(vippsProductDescription("Første linje\nAndre linje")).toBe("Første linje Andre linje");
  });

  it("shortens an over-long description at a word boundary within the Vipps limit", () => {
    const long = "Et fast årlig bidrag som går rett til korpset ".repeat(5);
    const result = vippsProductDescription(long);
    expect(result.length).toBeLessThanOrEqual(VIPPS_PRODUCT_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("  ");
  });

  it("leaves a description that already fits untouched", () => {
    expect(vippsProductDescription("Kort og godt.")).toBe("Kort og godt.");
  });
});

describe("membershipTierKey", () => {
  it("derives a stable URL-safe key from the tier name", () => {
    expect(membershipTierKey("Støttemedlemskap")).toBe("stottemedlemskap");
    expect(membershipTierKey("Gullmedlem — Æresrekke")).toBe("gullmedlem-aeresrekke");
  });

  it("caps the key length without leaving a trailing hyphen", () => {
    const key = membershipTierKey("Et veldig langt navn på et medlemskapsnivå");
    expect(key.length).toBeLessThanOrEqual(MEMBERSHIP_TIER_KEY_MAX_LENGTH);
    expect(key.endsWith("-")).toBe(false);
  });

  it("falls back when nothing key-worthy remains", () => {
    expect(membershipTierKey("!!!")).toBe("medlemskap");
  });
});

describe("tierAgreementExternalId", () => {
  it("joins tier key and membership id, and parses back", () => {
    const membershipId = crypto.randomUUID();
    const externalId = tierAgreementExternalId("gullmedlem", membershipId);
    expect(externalId).toBe(`gullmedlem:${membershipId}`);
    expect(tierKeyFromAgreementExternalId(externalId)).toBe("gullmedlem");
  });

  it("always fits Vipps' externalId limit for max-length keys and UUID ids", () => {
    const key = "x".repeat(MEMBERSHIP_TIER_KEY_MAX_LENGTH);
    const externalId = tierAgreementExternalId(key, crypto.randomUUID());
    expect(externalId.length).toBeLessThanOrEqual(VIPPS_EXTERNAL_ID_MAX_LENGTH);
  });

  it("returns null for external ids not written by the convention", () => {
    expect(tierKeyFromAgreementExternalId("no-colon-here")).toBeNull();
    expect(tierKeyFromAgreementExternalId(":starts-with-colon")).toBeNull();
  });
});

describe("slugifyOrganizationName", () => {
  it("transliterates Norwegian letters and squashes separators", () => {
    expect(slugifyOrganizationName("Nordnes Skolekorps")).toBe("nordnes-skolekorps");
    expect(slugifyOrganizationName("Bærum Kvinnekor — Øst/Vest")).toBe("baerum-kvinnekor-ost-vest");
    expect(slugifyOrganizationName("Håp i Havet!")).toBe("hap-i-havet");
  });

  it("falls back when nothing slug-worthy remains", () => {
    expect(slugifyOrganizationName("!!!")).toBe("min-organisasjon");
  });
});

describe("joinPageUrl / joinPageTermsUrl", () => {
  it("builds the one stable public address on the canonical punycode origin", () => {
    expect(joinPageUrl("nordnes-skolekorps")).toBe(
      "https://xn--stttemedlem-hgb.no/bli-medlem/nordnes-skolekorps",
    );
  });

  it("can carry a picked membership tier onward by key", () => {
    expect(joinPageUrl("nordnes-skolekorps", "gullmedlem")).toBe(
      "https://xn--stttemedlem-hgb.no/bli-medlem/nordnes-skolekorps?medlemskap=gullmedlem",
    );
  });

  it("puts the salgsvilkår beneath the same address", () => {
    expect(joinPageTermsUrl("nordnes-skolekorps")).toBe(
      "https://xn--stttemedlem-hgb.no/bli-medlem/nordnes-skolekorps/vilkar",
    );
  });

  it("exposes the bare path for same-origin links and route matching", () => {
    expect(joinPagePath("nordnes-skolekorps")).toBe("/bli-medlem/nordnes-skolekorps");
    expect(joinPageTermsPath("nordnes-skolekorps")).toBe("/bli-medlem/nordnes-skolekorps/vilkar");
  });
});

describe("formatOrganisasjonsnummer", () => {
  it("groups nine digits in threes and leaves other input untouched", () => {
    expect(formatOrganisasjonsnummer("923609016")).toBe("923 609 016");
    expect(formatOrganisasjonsnummer("923 609 016")).toBe("923 609 016");
    expect(formatOrganisasjonsnummer("ikke-et-orgnr")).toBe("ikke-et-orgnr");
  });
});

describe("isValidOrganisasjonsnummer", () => {
  it("accepts valid MOD11 numbers, with or without grouping spaces", () => {
    expect(isValidOrganisasjonsnummer("923609016")).toBe(true);
    expect(isValidOrganisasjonsnummer("974 760 673")).toBe(true);
  });

  it("rejects wrong check digits, wrong lengths, and non-digits", () => {
    expect(isValidOrganisasjonsnummer("923609017")).toBe(false);
    expect(isValidOrganisasjonsnummer("12345678")).toBe(false);
    expect(isValidOrganisasjonsnummer("92360901a")).toBe(false);
    expect(isValidOrganisasjonsnummer("")).toBe(false);
  });
});

describe("annual period", () => {
  it("runs from the join date to 31 December of the same year", () => {
    expect(annualPeriodFor(new Date("2026-08-20T10:00:00Z"))).toEqual({
      year: 2026,
      start: "2026-08-20",
      end: "2026-12-31",
    });
  });

  it("gives a renewal the whole next calendar year", () => {
    expect(nextAnnualPeriod(annualPeriodFor(new Date("2026-08-20T10:00:00Z")))).toEqual({
      year: 2027,
      start: "2027-01-01",
      end: "2027-12-31",
    });
  });

  it("counts the join day itself as remaining", () => {
    expect(daysRemainingInYear(new Date("2026-12-31T23:00:00Z"))).toBe(1);
    expect(daysRemainingInYear(new Date("2026-01-01T00:00:00Z"))).toBe(365);
    expect(daysRemainingInYear(new Date("2028-01-01T00:00:00Z"))).toBe(366);
  });
});

describe("proratedJoinFeeNok", () => {
  it("charges the full fee for a 1 January join", () => {
    expect(proratedJoinFeeNok(250, new Date("2026-01-01T09:00:00Z"))).toBe(250);
  });

  it("charges the remaining share of the year mid-year", () => {
    // 2026-08-20 → 134 days left of 365; 250 × 134/365 = 91.8 → 92
    expect(proratedJoinFeeNok(250, new Date("2026-08-20T12:00:00Z"))).toBe(92);
    // Half a year left is about half the fee.
    expect(proratedJoinFeeNok(1200, new Date("2026-07-01T00:00:00Z"))).toBe(605);
  });

  it("never charges nothing, and never more than the annual fee", () => {
    expect(proratedJoinFeeNok(250, new Date("2026-12-31T12:00:00Z"))).toBe(1);
    expect(proratedJoinFeeNok(250, new Date("2026-01-01T00:00:00Z"))).toBe(250);
  });

  it("accounts for the extra day in a leap year", () => {
    expect(daysInYear(2028)).toBe(366);
    expect(daysInYear(2026)).toBe(365);
  });
});

describe("renewal timing", () => {
  it("arranges renewals from 1 December, not before", () => {
    expect(isRenewalWindow(new Date("2026-11-30T23:00:00Z"))).toBe(false);
    expect(isRenewalWindow(new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(isRenewalWindow(new Date("2026-12-31T23:59:00Z"))).toBe(true);
  });

  it("leaves most of the year alone", () => {
    expect(isRenewalWindow(new Date("2026-01-02T00:00:00Z"))).toBe(false);
    expect(isRenewalWindow(new Date("2026-08-20T12:00:00Z"))).toBe(false);
  });

  it("always pays for the next calendar year", () => {
    expect(renewalPeriodYear(new Date("2026-12-01T00:00:00Z"))).toBe(2027);
    expect(renewalPeriodYear(new Date("2026-12-31T23:00:00Z"))).toBe(2027);
  });
});

describe("stableUuid", () => {
  it("is the same for the same seed and different for another", async () => {
    const a = await stableUuid("renewal:agreement-1:2027");
    const b = await stableUuid("renewal:agreement-1:2027");
    const c = await stableUuid("renewal:agreement-1:2028");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("is a well-formed v4-shaped UUID, which is what Vipps validates", async () => {
    const uuid = await stableUuid("renewal:agreement-1:2027");
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("memberUnsubscribePath", () => {
  it("lives under the org's public pages and carries the member's token", () => {
    expect(memberUnsubscribePath("nordnes", "tok-1")).toBe(
      "/bli-medlem/nordnes/meldinger-av?n=tok-1",
    );
  });

  it("keeps a token with reserved characters intact in the URL", () => {
    expect(memberUnsubscribePath("nordnes", "a/b&c")).toBe(
      "/bli-medlem/nordnes/meldinger-av?n=a%2Fb%26c",
    );
  });
});

describe("iso-week period scheme (the accelerated staging calendar)", () => {
  // 2026-08-27 is a Thursday in ISO week 35.
  const thursday = new Date("2026-08-27T10:00:00Z");

  it("keys a date to its ISO week, ordering chronologically across the year turn", () => {
    expect(isoWeekKey(thursday)).toBe(202635);
    // 2026-12-28 (Monday) starts ISO week 53 of 2026; 2027-01-04 starts week 1 of 2027.
    expect(isoWeekKey(new Date("2026-12-28T00:00:00Z"))).toBe(202653);
    expect(isoWeekKey(new Date("2027-01-03T23:00:00Z"))).toBe(202653);
    expect(isoWeekKey(new Date("2027-01-04T00:00:00Z"))).toBe(202701);
    expect(202701).toBeGreaterThan(202653);
    // 2026-01-01 (Thursday) belongs to week 1 of 2026, not to 2025.
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe(202601);
  });

  it("gives a join its remaining week and the full period its Monday–Sunday", () => {
    const period = isoWeekScheme.periodFor(thursday);
    expect(period).toEqual({ year: 202635, start: "2026-08-27", end: "2026-08-30" });
    expect(isoWeekScheme.fullPeriod(202635)).toEqual({
      year: 202635,
      start: "2026-08-24",
      end: "2026-08-30",
    });
  });

  it("steps to the next period across the turn of the ISO year", () => {
    expect(isoWeekScheme.nextPeriodKey(202635)).toBe(202636);
    expect(isoWeekScheme.nextPeriodKey(202653)).toBe(202701);
  });

  it("pro-rates the fee over the days left of the week, never below 1 kr", () => {
    const monday = new Date("2026-08-24T09:00:00Z");
    const sunday = new Date("2026-08-30T09:00:00Z");
    expect(isoWeekScheme.proratedJoinFeeNok(700, monday)).toBe(700);
    expect(isoWeekScheme.proratedJoinFeeNok(700, thursday)).toBe(400);
    expect(isoWeekScheme.proratedJoinFeeNok(700, sunday)).toBe(100);
    expect(isoWeekScheme.proratedJoinFeeNok(2, sunday)).toBe(1);
  });

  it("opens the renewal window on Saturday, two real days before the week turns", () => {
    expect(isoWeekScheme.isRenewalWindow(new Date("2026-08-28T23:00:00Z"))).toBe(false);
    expect(isoWeekScheme.isRenewalWindow(new Date("2026-08-29T00:00:00Z"))).toBe(true);
    expect(isoWeekScheme.isRenewalWindow(new Date("2026-08-30T12:00:00Z"))).toBe(true);
    expect(isoWeekScheme.renewalPeriodKey(new Date("2026-08-29T12:00:00Z"))).toBe(202636);
  });

  it("resolves from environment configuration, refusing a typo loudly", () => {
    expect(getPeriodScheme(undefined).name).toBe("calendar-year");
    expect(getPeriodScheme("calendar-year")).toBe(calendarYearScheme);
    expect(getPeriodScheme("iso-week")).toBe(isoWeekScheme);
    expect(() => getPeriodScheme("weekly")).toThrow(/unknown PERIOD_SCHEME/);
  });

  it("labels period keys for people whichever scheme wrote them", () => {
    expect(periodLabel(2026)).toBe("2026");
    expect(periodLabel(202635)).toBe("uke 35/2026");
  });

  it("keeps the calendar-year scheme identical to the plain functions", () => {
    expect(calendarYearScheme.periodFor(thursday)).toEqual(annualPeriodFor(thursday));
    expect(calendarYearScheme.fullPeriod(2026)).toEqual({
      year: 2026,
      start: "2026-01-01",
      end: "2026-12-31",
    });
    expect(calendarYearScheme.nextPeriodKey(2026)).toBe(2027);
  });
});
