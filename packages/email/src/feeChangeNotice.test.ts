import { describe, expect, it } from "vitest";
import { feeChangeNotice } from "./feeChangeNotice.js";

const base = {
  orgName: "Fjellbygda Musikklag",
  orgContactEmail: "post@fjellbygda-eksempel.no",
  memberName: "Ingrid Solheim",
  memberEmail: "ingrid@eksempel.no",
  tierName: "Støttemedlem",
  previousFeeNok: 250,
  newFeeNok: 300,
  effectivePeriod: "2027",
  manageUrl: "https://example.test/bli-medlem/fjellbygda/min-side?n=abc",
};

describe("feeChangeNotice", () => {
  it("names both amounts, because the app only ever shows the new one", () => {
    const message = feeChangeNotice(base);
    expect(message.text).toContain("300 kr");
    expect(message.text).toContain("250 kr");
    expect(message.subject).toContain("300 kr");
    expect(message.subject).toContain("2027");
  });

  it("always offers the way out", () => {
    const message = feeChangeNotice(base);
    expect(message.text).toContain(base.manageUrl);
    expect(message.html).toContain(base.manageUrl);
  });

  it("comes from the organization and replies to it", () => {
    const message = feeChangeNotice(base);
    expect(message.fromName).toBe("Fjellbygda Musikklag");
    expect(message.replyTo).toBe("post@fjellbygda-eksempel.no");
  });

  it("points questions at the organization's own address, not the noreply sender", () => {
    const message = feeChangeNotice(base);
    expect(message.text).toContain("adresse som ikke leses");
    expect(message.text).toContain("kontakt Fjellbygda Musikklag på post@fjellbygda-eksempel.no");
    expect(message.html).toContain("post@fjellbygda-eksempel.no");
  });

  it("still points at the organization when it has no contact address", () => {
    const message = feeChangeNotice({ ...base, orgContactEmail: null });
    expect(message.text).toContain("ta kontakt med Fjellbygda Musikklag direkte");
    expect(message.replyTo).toBeUndefined();
  });

  it("greets a member who shared no name without an empty gap", () => {
    const message = feeChangeNotice({ ...base, memberName: null });
    expect(message.text.startsWith("Hei,")).toBe(true);
    expect(message.text).not.toContain("Hei ,");
  });

  it("says a lowered price is lowered", () => {
    const message = feeChangeNotice({ ...base, previousFeeNok: 300, newFeeNok: 250 });
    expect(message.text).toContain("settes ned");
    expect(message.text).not.toContain("øker");
  });

  it("carries the brand attribution, in punycode", () => {
    const message = feeChangeNotice(base);
    expect(message.text).toContain("støttemedlem.no");
    expect(message.html).toContain("https://xn--stttemedlem-hgb.no");
  });

  it("does not let an organization name inject markup", () => {
    const message = feeChangeNotice({ ...base, orgName: '<script>alert("x")</script>' });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
