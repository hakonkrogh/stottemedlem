import { describe, expect, it } from "vitest";
import {
  countMembersByStatus,
  isProfileComplete,
  type MemberOverview,
  matchesMemberSearch,
  membershipStatus,
} from "./index.js";
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
  it("is complete only when orgnr, contact email and at least one tier are set", () => {
    expect(isProfileComplete(base, 1)).toBe(true);
    expect(isProfileComplete({ ...base, orgnr: null }, 1)).toBe(false);
    expect(isProfileComplete({ ...base, contactEmail: null }, 1)).toBe(false);
    expect(isProfileComplete(base, 0)).toBe(false);
  });
});

describe("membershipStatus", () => {
  const today = new Date("2026-08-20T12:00:00Z");

  it("is active for the current calendar year", () => {
    expect(membershipStatus(2026, today)).toBe("active");
  });

  it("is lapsed once the year has passed", () => {
    expect(membershipStatus(2025, today)).toBe("lapsed");
  });

  it("treats a period already paid for next year as active", () => {
    expect(membershipStatus(2027, today)).toBe("active");
  });

  it("flips on 1 January without anything being written", () => {
    expect(membershipStatus(2026, new Date("2026-12-31T23:59:59Z"))).toBe("active");
    expect(membershipStatus(2026, new Date("2027-01-01T00:00:00Z"))).toBe("lapsed");
  });
});

const overview = (
  name: string | null,
  status: "active" | "lapsed",
  extra: Partial<MemberOverview["member"]> = {},
): MemberOverview => ({
  member: {
    id: name ?? "anon",
    orgId: base.id,
    name,
    email: null,
    phone: null,
    vippsSub: null,
    createdAt: "2026-01-01 00:00:00",
    ...extra,
  },
  latest: null,
  status,
  renewing: false,
});

describe("countMembersByStatus", () => {
  it("counts current supporters apart from lapsed ones", () => {
    const counts = countMembersByStatus([
      overview("Ingrid", "active"),
      overview("Bjørn", "active"),
      overview("Marit", "lapsed"),
    ]);
    expect(counts).toEqual({ active: 2, lapsed: 1 });
  });

  it("is zero for an organization with no supporters yet", () => {
    expect(countMembersByStatus([])).toEqual({ active: 0, lapsed: 0 });
  });
});

describe("matchesMemberSearch", () => {
  const ingrid = overview("Ingrid Solheim", "active", {
    email: "ingrid@eksempel.example",
    phone: "4711111111",
  });

  it("shows everyone when nothing is typed", () => {
    expect(matchesMemberSearch(ingrid, "")).toBe(true);
    expect(matchesMemberSearch(ingrid, "   ")).toBe(true);
  });

  it("finds a member by any of the three ways anyone remembers a person", () => {
    expect(matchesMemberSearch(ingrid, "solheim")).toBe(true);
    expect(matchesMemberSearch(ingrid, "EKSEMPEL")).toBe(true);
    expect(matchesMemberSearch(ingrid, "4711")).toBe(true);
    expect(matchesMemberSearch(ingrid, "bjørn")).toBe(false);
  });

  it("does not crash on a supporter who consented to no name", () => {
    expect(matchesMemberSearch(overview(null, "active"), "ingrid")).toBe(false);
  });
});
