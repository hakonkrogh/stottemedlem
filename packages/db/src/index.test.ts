import { describe, expect, it } from "vitest";
import {
  chargeIdMatching,
  countMemberStandings,
  coveredPeriod,
  feeMayBeChargedNow,
  hasAcceptedDpa,
  isCurrentMember,
  isProfileComplete,
  type MemberFeeStanding,
  type MemberOverview,
  matchesMemberSearch,
  memberStanding,
  membershipStanding,
  membershipStatus,
  owesFeeChangeNotice,
  renewalFeeNok,
  resumeCostsNow,
  type StatsAgreementRow,
  type StatsPeriodRow,
  summarizeOrganization,
} from "./index.js";
import type { Organization } from "./schema.js";

const base: Organization = {
  id: "00000000-0000-0000-0000-000000000001",
  workosOrgId: "org_test",
  name: "Bakvendtland Skolekorps",
  slug: "bakvendtland-skolekorps",
  orgnr: "923609016",
  contactEmail: "post@bakvendtland.example",
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

const period = (memberId: string, year: number): MemberOverview["latest"] => ({
  id: `ms-${memberId}-${year}`,
  orgId: base.id,
  memberId,
  agreementId: `agr-${memberId}`,
  tierId: "tier-1",
  tierName: "Støttemedlem",
  periodYear: year,
  periodStart: `${year}-01-01`,
  periodEnd: `${year}-12-31`,
  annualFeeNok: 300,
  paidNok: 300,
  createdAt: `${year}-01-01 00:00:00`,
});

describe("membershipStanding", () => {
  it("stays active while the renewal payment is still being retried", () => {
    expect(membershipStanding(2026, 2027, 2027)).toBe("active");
  });

  it("lapses once the renewal has definitively failed (no open charge left)", () => {
    expect(membershipStanding(2026, null, 2027)).toBe("lapsed");
  });

  it("a stale open charge for a past period grants nothing", () => {
    expect(membershipStanding(2025, 2026, 2027)).toBe("lapsed");
  });

  it("a paid current period needs no pending renewal", () => {
    expect(membershipStanding(2027, null, 2027)).toBe("active");
  });

  it("never paid and nothing pending is lapsed", () => {
    expect(membershipStanding(null, null, 2027)).toBe("lapsed");
  });
});

describe("coveredPeriod", () => {
  it("is the paid period while that period is current", () => {
    expect(coveredPeriod(2027, null, 2027)).toBe(2027);
  });

  it("is the period being renewed while the payment is still being retried", () => {
    // The card would otherwise say "gyldig 2026" all through January 2027.
    expect(coveredPeriod(2026, 2027, 2027)).toBe(2027);
  });

  it("falls back to the last period supported once the renewal has failed", () => {
    expect(coveredPeriod(2026, null, 2027)).toBe(2026);
  });

  it("a stale open charge for a past period covers nothing new", () => {
    expect(coveredPeriod(2025, 2026, 2027)).toBe(2025);
  });

  it("keeps a period paid ahead of the current one", () => {
    expect(coveredPeriod(2028, null, 2027)).toBe(2028);
  });

  it("is nothing at all when nothing was ever paid", () => {
    expect(coveredPeriod(null, null, 2027)).toBeNull();
  });

  it("never disagrees with the standing: a covered period means active", () => {
    const cases: [number | null, number | null, number][] = [
      [2027, null, 2027],
      [2026, 2027, 2027],
      [2026, null, 2027],
      [2025, 2026, 2027],
      [2028, null, 2027],
      [null, null, 2027],
    ];
    for (const [paid, pending, current] of cases) {
      const covered = coveredPeriod(paid, pending, current);
      const active = membershipStanding(paid, pending, current) === "active";
      expect(covered !== null && covered >= current).toBe(active);
    }
  });
});

const overview = (
  name: string | null,
  status: "active" | "lapsed",
  extra: Partial<MemberOverview["member"]> = {},
  /** Standing is the pair of these two, so both are steerable per fixture. */
  standing: { paid?: boolean; renewing?: boolean } = {},
): MemberOverview => {
  const id = name ?? "anon";
  const { paid = true, renewing = false } = standing;
  return {
    member: {
      id,
      orgId: base.id,
      name,
      email: null,
      phone: null,
      vippsSub: null,
      cardToken: null,
      referredByMemberId: null,
      messagesDeclinedAt: null,
      createdAt: "2026-01-01 00:00:00",
      ...extra,
    },
    latest: paid ? period(id, status === "active" ? 2026 : 2024) : null,
    status,
    renewing,
    hearts: paid ? 1 : 0,
    recruits: 0,
    // Shaped like Vipps' ids, and sharing no letters with the name so a search
    // for one cannot accidentally hit the other.
    chargeIds: paid ? [`chr-${id.length}k9Q`] : [],
  };
};

describe("memberStanding", () => {
  it("separates a supporter who continues from one whose arrangement has ended", () => {
    expect(memberStanding(overview("Ingrid", "active", {}, { renewing: true }))).toBe("renewing");
    expect(memberStanding(overview("Bjørn", "active", {}, { renewing: false }))).toBe("ending");
  });

  it("counts both of those as current — support ends when the period does", () => {
    expect(isCurrentMember(overview("Ingrid", "active", {}, { renewing: true }))).toBe(true);
    expect(isCurrentMember(overview("Bjørn", "active", {}, { renewing: false }))).toBe(true);
    expect(isCurrentMember(overview("Marit", "lapsed"))).toBe(false);
  });

  it("is lapsed once the paid period has passed, whatever the arrangement says", () => {
    expect(memberStanding(overview("Marit", "lapsed", {}, { renewing: false }))).toBe("lapsed");
    expect(memberStanding(overview("Marit", "lapsed", {}, { renewing: true }))).toBe("lapsed");
  });

  it("never claims a supporter with no completed payment is renewing", () => {
    // Recorded on approval, seconds before the first payment lands: the
    // arrangement is live, but no money has arrived.
    const justApproved = overview("Ny", "lapsed", {}, { paid: false, renewing: true });
    expect(memberStanding(justApproved)).toBe("unpaid");
    expect(isCurrentMember(justApproved)).toBe(false);
  });
});

describe("countMemberStandings", () => {
  it("counts each standing, and both kinds of current supporter as active", () => {
    const counts = countMemberStandings([
      overview("Ingrid", "active", {}, { renewing: true }),
      overview("Bjørn", "active", {}, { renewing: false }),
      overview("Marit", "lapsed"),
      overview("Ny", "lapsed", {}, { paid: false, renewing: true }),
    ]);
    expect(counts).toEqual({ all: 4, active: 2, renewing: 1, ending: 1, lapsed: 1, unpaid: 1 });
  });

  it("keeps a supporter who never paid out of the lapsed count", () => {
    const counts = countMemberStandings([overview("Ny", "lapsed", {}, { paid: false })]);
    expect(counts.lapsed).toBe(0);
    expect(counts.unpaid).toBe(1);
  });

  it("is zero for an organization with no supporters yet", () => {
    expect(countMemberStandings([])).toEqual({
      all: 0,
      active: 0,
      renewing: 0,
      ending: 0,
      lapsed: 0,
      unpaid: 0,
    });
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

  it("finds a member by the payment reference the provider's portal shows", () => {
    expect(matchesMemberSearch(ingrid, "chr-14k9Q")).toBe(true);
    expect(matchesMemberSearch(ingrid, "CHR-14K9Q")).toBe(true);
    expect(matchesMemberSearch(ingrid, "chr-99k9Q")).toBe(false);
  });
});

describe("chargeIdMatching", () => {
  const ingrid = overview("Ingrid Solheim", "active");

  it("names the payment a reference found, so the member can be opened on it", () => {
    expect(chargeIdMatching(ingrid, " chr-14k9q ")).toBe("chr-14k9Q");
  });

  it("is null when the member was found by who they are, or not at all", () => {
    expect(chargeIdMatching(ingrid, "solheim")).toBeNull();
    expect(chargeIdMatching(ingrid, "")).toBeNull();
    expect(chargeIdMatching(overview("Ny", "lapsed", {}, { paid: false }), "chr")).toBeNull();
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

describe("feeMayBeChargedNow", () => {
  const cutoff = "2026-08-17";

  it("holds back a fee change the member has not known long enough", () => {
    expect(feeMayBeChargedNow({ kind: "fee-change", sentAt: "2026-08-30" }, cutoff)).toBe(false);
  });

  it("lets through a fee change the member has known since before the cutoff", () => {
    expect(feeMayBeChargedNow({ kind: "fee-change", sentAt: "2026-08-01" }, cutoff)).toBe(true);
  });

  it("charges a tier the member chose themselves at once, however fresh", () => {
    // The waiting period protects against the ORGANIZATION's changes. Making a
    // member wait for their own decision would charge them the old amount for
    // another period.
    expect(feeMayBeChargedNow({ kind: "tier-choice", sentAt: "2026-08-31" }, cutoff)).toBe(true);
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

describe("hasAcceptedDpa", () => {
  // The data processing agreement is accepted by signing up
  // (specs/concepts/data-processing-agreement.md). What this decides is whether
  // the back office asks — so "accepted something once" must not count as
  // "accepted what is current".
  const org = (dpaAcceptedAt: string | null, dpaVersion: string | null): Organization =>
    ({ ...base, dpaAcceptedAt, dpaVersion }) as Organization;

  it("accepts an organization on the current version", () => {
    expect(hasAcceptedDpa(org("2026-08-31T09:00:00.000Z", "2026-08-31"), "2026-08-31")).toBe(true);
  });

  it("does not accept an organization that predates the agreement", () => {
    expect(hasAcceptedDpa(org(null, null), "2026-08-31")).toBe(false);
  });

  it("does not accept an organization left on a superseded version", () => {
    expect(hasAcceptedDpa(org("2026-08-31T09:00:00.000Z", "2026-08-31"), "2027-01-15")).toBe(false);
  });

  it("does not accept a version recorded without a date, or a date without a version", () => {
    expect(hasAcceptedDpa(org(null, "2026-08-31"), "2026-08-31")).toBe(false);
    expect(hasAcceptedDpa(org("2026-08-31T09:00:00.000Z", null), "2026-08-31")).toBe(false);
  });
});

describe("resumeCostsNow", () => {
  it("asks for nothing inside a period the member already paid for", () => {
    expect(resumeCostsNow(2026, 2026)).toBe(false);
  });

  it("charges a lapsed member, who is joining like anyone else", () => {
    expect(resumeCostsNow(2025, 2026)).toBe(true);
  });

  it("treats a member who never paid as owing this period", () => {
    expect(resumeCostsNow(null, 2026)).toBe(true);
  });

  it("asks for nothing when a later period is already covered", () => {
    expect(resumeCostsNow(2027, 2026)).toBe(false);
  });

  it("works on the accelerated ISO-week calendar too", () => {
    expect(resumeCostsNow(202636, 202636)).toBe(false);
    expect(resumeCostsNow(202635, 202636)).toBe(true);
  });
});

describe("summarizeOrganization", () => {
  const PERIOD = { key: 2026, start: "2026-01-01", end: "2026-12-31" };

  const period = (memberId: string, periodYear: number, paidNok: number): StatsPeriodRow => ({
    memberId,
    periodYear,
    paidNok,
  });

  const agreement = (
    agreementId: string,
    memberId: string | null,
    annualFeeNok: number,
    extra: Partial<StatsAgreementRow> = {},
  ): StatsAgreementRow => ({
    agreementId,
    memberId,
    status: "ACTIVE",
    annualFeeNok,
    createdAt: "2026-01-02",
    stoppedAt: null,
    ...extra,
  });

  const stopped = (
    agreementId: string,
    memberId: string,
    annualFeeNok: number,
    stoppedAt: string,
  ): StatsAgreementRow =>
    agreement(agreementId, memberId, annualFeeNok, { status: "STOPPED", stoppedAt });

  it("counts nothing for an organization nobody has joined", () => {
    expect(summarizeOrganization([], [], PERIOD)).toEqual({
      annualSupportNok: 0,
      activeMembers: 0,
      renewingMembers: 0,
      endingMembers: 0,
      lapsedMembers: 0,
      newMembers: 0,
      stoppedMembers: 0,
      paidThisPeriodNok: 0,
      paidAllTimeNok: 0,
    });
  });

  it("expects a year of every running arrangement at today's price", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2026, 300), period("m-2", 2026, 1000)],
      [agreement("a-1", "m-1", 400), agreement("a-2", "m-2", 1000)],
      PERIOD,
    );
    // The tier's fee now, not the 300 that was actually paid for this period.
    expect(stats.annualSupportNok).toBe(1400);
  });

  it("leaves an ended arrangement out of the yearly figure but not out of the members", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2026, 300), period("m-2", 2026, 300)],
      [agreement("a-1", "m-1", 300), stopped("a-2", "m-2", 300, "2026-06-01T09:00:00.000Z")],
      PERIOD,
    );
    expect(stats.annualSupportNok).toBe(300);
    expect(stats.activeMembers).toBe(2);
    expect(stats.renewingMembers).toBe(1);
    expect(stats.endingMembers).toBe(1);
  });

  it("counts one supporter once when they hold two running arrangements", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2026, 300)],
      [
        agreement("a-1", "m-1", 300, { createdAt: "2026-01-02" }),
        agreement("a-2", "m-1", 1000, { createdAt: "2026-03-04" }),
      ],
      PERIOD,
    );
    // The newest arrangement is the one they are on now.
    expect(stats.annualSupportNok).toBe(1000);
    expect(stats.renewingMembers).toBe(1);
  });

  it("tells this period's supporters from the ones who stopped supporting", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2026, 300), period("m-2", 2025, 300), period("m-1", 2025, 300)],
      [agreement("a-1", "m-1", 300)],
      PERIOD,
    );
    expect(stats.activeMembers).toBe(1);
    expect(stats.lapsedMembers).toBe(1);
  });

  it("counts a supporter as new only in their first period", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2025, 300), period("m-1", 2026, 300), period("m-2", 2026, 150)],
      [],
      PERIOD,
    );
    expect(stats.newMembers).toBe(1);
  });

  it("adds up what was paid for this period and what was ever paid", () => {
    const stats = summarizeOrganization(
      [period("m-1", 2025, 300), period("m-1", 2026, 300), period("m-2", 2026, 150)],
      [],
      PERIOD,
    );
    expect(stats.paidThisPeriodNok).toBe(450);
    expect(stats.paidAllTimeNok).toBe(750);
  });

  describe("who stopped in this period", () => {
    it("counts an arrangement ended inside the period", () => {
      const stats = summarizeOrganization(
        [period("m-1", 2026, 300)],
        [stopped("a-1", "m-1", 300, "2026-06-01T09:00:00.000Z")],
        PERIOD,
      );
      expect(stats.stoppedMembers).toBe(1);
    });

    it("ignores one ended before the period began", () => {
      const stats = summarizeOrganization(
        [period("m-1", 2025, 300)],
        [stopped("a-1", "m-1", 300, "2025-11-30T09:00:00.000Z")],
        PERIOD,
      );
      expect(stats.stoppedMembers).toBe(0);
    });

    it("takes the last day of the period, and not the first of the next", () => {
      const onTheEdge = summarizeOrganization(
        [],
        [stopped("a-1", "m-1", 300, "2026-12-31T23:59:00.000Z")],
        PERIOD,
      );
      expect(onTheEdge.stoppedMembers).toBe(1);
      const justAfter = summarizeOrganization(
        [],
        [stopped("a-1", "m-1", 300, "2027-01-01T00:01:00.000Z")],
        PERIOD,
      );
      expect(justAfter.stoppedMembers).toBe(0);
    });

    it("does not count a supporter who stopped and joined again", () => {
      const stats = summarizeOrganization(
        [period("m-1", 2026, 300)],
        [
          stopped("a-1", "m-1", 300, "2026-06-01T09:00:00.000Z"),
          agreement("a-2", "m-1", 300, { createdAt: "2026-06-01" }),
        ],
        PERIOD,
      );
      // They ended an arrangement, not their support.
      expect(stats.stoppedMembers).toBe(0);
      expect(stats.renewingMembers).toBe(1);
    });

    it("counts a person once however many arrangements of theirs ended", () => {
      const stats = summarizeOrganization(
        [],
        [
          stopped("a-1", "m-1", 300, "2026-02-01T09:00:00.000Z"),
          stopped("a-2", "m-1", 300, "2026-08-01T09:00:00.000Z"),
        ],
        PERIOD,
      );
      expect(stats.stoppedMembers).toBe(1);
    });

    it("counts an arrangement the provider let expire, not only one the member ended", () => {
      const stats = summarizeOrganization(
        [],
        [
          agreement("a-1", "m-1", 300, {
            status: "EXPIRED",
            stoppedAt: "2026-04-01T09:00:00.000Z",
          }),
        ],
        PERIOD,
      );
      expect(stats.stoppedMembers).toBe(1);
    });
  });
});
