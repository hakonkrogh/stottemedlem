import { describe, expect, it } from "vitest";
import {
  formatOrganisasjonsnummer,
  isValidOrganisasjonsnummer,
  joinEntryPointUrl,
  MEMBERSHIP_TIER_KEY_MAX_LENGTH,
  membershipTierKey,
  orgLandingPageUrl,
  orgTermsUrl,
  slugifyOrganizationName,
  tierAgreementExternalId,
  tierKeyFromAgreementExternalId,
  VIPPS_EXTERNAL_ID_MAX_LENGTH,
} from "./index.js";

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

describe("joinEntryPointUrl", () => {
  it("builds the stable entry point on the canonical punycode origin", () => {
    expect(joinEntryPointUrl("nordnes-skolekorps")).toBe(
      "https://xn--stttemedlem-hgb.no/bli-med/nordnes-skolekorps",
    );
  });

  it("can point at a specific membership tier by key", () => {
    expect(joinEntryPointUrl("nordnes-skolekorps", "gullmedlem")).toBe(
      "https://xn--stttemedlem-hgb.no/bli-med/nordnes-skolekorps?medlemskap=gullmedlem",
    );
  });
});

describe("orgLandingPageUrl / orgTermsUrl", () => {
  it("builds the public landing page and salgsvilkår URLs on the canonical origin", () => {
    expect(orgLandingPageUrl("nordnes-skolekorps")).toBe(
      "https://xn--stttemedlem-hgb.no/org/nordnes-skolekorps",
    );
    expect(orgTermsUrl("nordnes-skolekorps")).toBe(
      "https://xn--stttemedlem-hgb.no/org/nordnes-skolekorps/vilkar",
    );
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
