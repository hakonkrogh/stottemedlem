import { describe, expect, it } from "vitest";
import { greetMember, type Member, tierLabel } from "./index.js";

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
