import { describe, expect, it } from "vitest";
import {
  formatOrganisasjonsnummer,
  isValidOrganisasjonsnummer,
  joinPagePath,
  joinPageTermsUrl,
  joinPageUrl,
  MEMBERSHIP_TIER_KEY_MAX_LENGTH,
  membershipTierKey,
  normalizeMembershipTierDescription,
  slugifyOrganizationName,
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
