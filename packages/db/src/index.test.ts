import { describe, expect, it } from "vitest";
import {
  countMembersByStatus,
  inMessageAudience,
  isMessageReachable,
  isProfileComplete,
  type MemberFeeStanding,
  type MemberOverview,
  type MessageableMember,
  matchesMemberSearch,
  membershipStatus,
  messageReach,
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
  it("is active for the current period", () => {
    expect(membershipStatus(2026, 2026)).toBe("active");
  });

  it("is lapsed once the period has passed", () => {
    expect(membershipStatus(2025, 2026)).toBe("lapsed");
  });

  it("treats a period already paid for next year as active", () => {
    expect(membershipStatus(2027, 2026)).toBe("active");
  });

  it("flips the moment the caller's current period moves on, nothing written", () => {
    expect(membershipStatus(2026, 2026)).toBe("active");
    expect(membershipStatus(2026, 2027)).toBe("lapsed");
  });

  it("works the same for accelerated ISO-week keys, across the year turn", () => {
    expect(membershipStatus(202635, 202635)).toBe("active");
    expect(membershipStatus(202653, 202701)).toBe("lapsed");
    expect(membershipStatus(202701, 202653)).toBe("active");
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
    messagesDeclinedAt: null,
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
    messagesDeclinedAt: null,
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

const messageable = (
  status: "active" | "lapsed",
  extra: { email?: string | null; manageToken?: string | null; declinedAt?: string | null } = {},
): MessageableMember => ({
  member: {
    id: crypto.randomUUID(),
    orgId: base.id,
    name: "Et Medlem",
    email: extra.email === undefined ? "medlem@eksempel.example" : extra.email,
    phone: null,
    vippsSub: null,
    messagesDeclinedAt: extra.declinedAt ?? null,
    createdAt: "2026-01-01 00:00:00",
  },
  status,
  manageToken: extra.manageToken === undefined ? "tok" : extra.manageToken,
});

describe("messageReach", () => {
  const everyone = [
    messageable("active"),
    messageable("active", { email: null }),
    messageable("active", { manageToken: null }),
    messageable("active", { declinedAt: "2026-05-01 00:00:00" }),
    messageable("lapsed"),
    messageable("lapsed", { email: "  " }),
  ];

  it("reaches active members by default; lapsed only as a deliberate choice", () => {
    expect(messageReach(everyone, "active")).toEqual({ reached: 1, unreachable: 2, declined: 1 });
    expect(messageReach(everyone, "all")).toEqual({ reached: 2, unreachable: 3, declined: 1 });
  });

  it("counts a member who declined as declined, never as reachable", () => {
    const declined = [messageable("active", { declinedAt: "2026-05-01 00:00:00" })];
    expect(messageReach(declined, "active")).toEqual({ reached: 0, unreachable: 0, declined: 1 });
  });

  it("treats a member without their own page as unreachable — every message must carry the one-click decline", () => {
    expect(isMessageReachable(messageable("active", { manageToken: null }))).toBe(false);
    expect(isMessageReachable(messageable("active"))).toBe(true);
  });

  it("never lets a lapsed member into the default audience", () => {
    expect(inMessageAudience(messageable("lapsed"), "active")).toBe(false);
    expect(inMessageAudience(messageable("lapsed"), "all")).toBe(true);
  });
});
