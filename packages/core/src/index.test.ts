import { describe, expect, it } from "vitest";
import {
  formatOrganisasjonsnummer,
  greetMember,
  isValidOrganisasjonsnummer,
  joinEntryPointUrl,
  type Member,
  orgLandingPageUrl,
  orgTermsUrl,
  slugifyOrganizationName,
  tierLabel,
} from "./index.js";

const member: Member = {
  id: "1",
  name: "Ada",
  email: "ada@example.com",
  tier: "patron",
  joinedAt: new Date("2026-01-01"),
};

describe("tierLabel", () => {
  it("maps tiers to Norwegian labels", () => {
    expect(tierLabel("supporter")).toBe("Støttemedlem");
    expect(tierLabel("patron")).toBe("Æresmedlem");
  });
});

describe("greetMember", () => {
  it("greets a member by name and tier", () => {
    expect(greetMember(member)).toBe("Velkommen, Ada! (Æresmedlem)");
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
