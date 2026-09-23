import { describe, expect, it } from "vitest";
import { orgSignupNotice } from "./orgSignupNotice.js";

const base = {
  to: "drift@bakvendtland.example",
  orgName: "Bakvendtland Skolekorps",
  orgnr: "123456785",
  slug: "bakvendtland-skolekorps",
  joinUrl: "https://xn--stttemedlem-hgb.no/bli-medlem/bakvendtland-skolekorps",
};

describe("orgSignupNotice", () => {
  it("names the new organization in the subject, so the inbox alone says who came", () => {
    expect(orgSignupNotice(base).subject).toBe("Ny organisasjon: Bakvendtland Skolekorps");
  });

  it("gives the identifiers and the join page", () => {
    const message = orgSignupNotice(base);
    for (const part of [base.orgnr, base.slug, base.joinUrl]) {
      expect(message.text).toContain(part);
      expect(message.html).toContain(part);
    }
  });

  it("goes to the product's own people, from the product", () => {
    const message = orgSignupNotice(base);
    expect(message.to).toBe(base.to);
    expect(message.fromName).toBe("støttemedlem.no");
    expect(message.replyTo).toBeUndefined();
  });

  it("escapes the name in the HTML body", () => {
    const message = orgSignupNotice({ ...base, orgName: "Korps <b>&</b> Co" });
    expect(message.html).toContain("Korps &lt;b&gt;&amp;&lt;/b&gt; Co");
  });
});
