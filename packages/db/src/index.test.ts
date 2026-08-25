import { describe, expect, it } from "vitest";
import {
  countMembersByStatus,
  isProfileComplete,
  type MemberFeeStanding,
  type MemberOverview,
  matchesMemberSearch,
  membershipStatus,
  owesFeeChangeNotice,
  renewalFeeNok,
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

const standing = (overrides: {
  tierFee: number;
  knownFeeNok: number;
  ripeFeeNok: number;
}): MemberFeeStanding => ({
  agreement: {
    id: "agr-1",
    orgId: base.id,
    memberId: "mem-1",
    tierId: "tier-1",
    vippsAgreementId: "agr_x",
    externalId: "stottemedlem:mem-1",
    status: "ACTIVE",
    annualFeeNok: overrides.knownFeeNok,
    vippsSub: null,
    manageToken: "tok",
    createdAt: "2026-01-02 00:00:00",
    activatedAt: "2026-01-02 00:00:00",
    stoppedAt: null,
    lastReconciledAt: null,
  },
  member: {
    id: "mem-1",
    orgId: base.id,
    name: "Ingrid Solheim",
    email: "ingrid@eksempel.no",
    phone: null,
    vippsSub: null,
    createdAt: "2026-01-02 00:00:00",
  },
  tier: {
    id: "tier-1",
    orgId: base.id,
    key: "stottemedlem",
    name: "Støttemedlem",
    description: null,
    annualFeeNok: overrides.tierFee,
    archivedAt: null,
    createdAt: "2026-01-01 00:00:00",
  },
  knownFeeNok: overrides.knownFeeNok,
  ripeFeeNok: overrides.ripeFeeNok,
  lastNoticeAt: null,
});

describe("owesFeeChangeNotice", () => {
  it("is owed exactly when the tier costs something other than the member believes", () => {
    expect(owesFeeChangeNotice(standing({ tierFee: 300, knownFeeNok: 250, ripeFeeNok: 250 }))).toBe(
      true,
    );
    expect(owesFeeChangeNotice(standing({ tierFee: 250, knownFeeNok: 250, ripeFeeNok: 250 }))).toBe(
      false,
    );
  });

  it("is not owed again once the member has been told, even before it takes effect", () => {
    // Told yesterday: knownFee already the new one, ripeFee still the old.
    expect(owesFeeChangeNotice(standing({ tierFee: 300, knownFeeNok: 300, ripeFeeNok: 250 }))).toBe(
      false,
    );
  });
});

describe("renewalFeeNok", () => {
  it("charges the tier's fee when nothing has changed", () => {
    expect(renewalFeeNok(standing({ tierFee: 250, knownFeeNok: 250, ripeFeeNok: 250 }))).toBe(250);
  });

  it("charges the new fee once the member has known it long enough", () => {
    expect(renewalFeeNok(standing({ tierFee: 300, knownFeeNok: 300, ripeFeeNok: 300 }))).toBe(300);
  });

  it("holds the old price when the rise was announced too recently", () => {
    expect(renewalFeeNok(standing({ tierFee: 300, knownFeeNok: 300, ripeFeeNok: 250 }))).toBe(250);
  });

  it("holds the old price when the member has not been told at all", () => {
    expect(renewalFeeNok(standing({ tierFee: 300, knownFeeNok: 250, ripeFeeNok: 250 }))).toBe(250);
  });

  it("passes a price cut on immediately — being charged less is no surprise", () => {
    expect(renewalFeeNok(standing({ tierFee: 200, knownFeeNok: 200, ripeFeeNok: 250 }))).toBe(200);
  });
});
