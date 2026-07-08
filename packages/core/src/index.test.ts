import { describe, expect, it } from "vitest";
import {
  greetMember,
  joinEntryPointUrl,
  type Member,
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
