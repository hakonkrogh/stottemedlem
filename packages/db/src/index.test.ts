import { describe, expect, it } from "vitest";
import { isProfileComplete } from "./index.js";
import type { Organization } from "./schema.js";

const base: Organization = {
  id: "00000000-0000-0000-0000-000000000001",
  workosOrgId: "org_test",
  name: "Nordnes Skolekorps",
  slug: "nordnes-skolekorps",
  orgnr: "923609016",
  contactEmail: "post@nordnesskolekorps.no",
  annualFeeNok: 300,
  createdAt: "2026-07-28 00:00:00",
};

describe("isProfileComplete", () => {
  it("is complete only when orgnr, contact email and annual fee are all set", () => {
    expect(isProfileComplete(base)).toBe(true);
    expect(isProfileComplete({ ...base, orgnr: null })).toBe(false);
    expect(isProfileComplete({ ...base, contactEmail: null })).toBe(false);
    expect(isProfileComplete({ ...base, annualFeeNok: null })).toBe(false);
  });
});
