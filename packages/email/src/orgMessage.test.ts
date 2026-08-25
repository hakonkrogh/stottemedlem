import { describe, expect, it } from "vitest";
import { bodyParagraphs, orgMessage } from "./orgMessage.js";

const base = {
  orgName: "Nordnes Skolekorps",
  orgContactEmail: "post@eksempel.example",
  memberEmail: "medlem@eksempel.example",
  subject: "Takk for støtten i år!",
  body: "Kjære støttemedlem,\n\ntakk for at du støtter korpset.\nDet betyr mye.\n\nHilsen styret",
  unsubscribeUrl: "https://xn--stttemedlem-hgb.no/bli-medlem/nordnes/meldinger-av?n=tok",
};

describe("bodyParagraphs", () => {
  it("splits on blank lines and keeps line breaks within a paragraph", () => {
    expect(bodyParagraphs(base.body)).toEqual([
      "Kjære støttemedlem,",
      "takk for at du støtter korpset.\nDet betyr mye.",
      "Hilsen styret",
    ]);
  });

  it("treats Windows line endings and stray whitespace the same", () => {
    expect(bodyParagraphs("Hei\r\n\r\n  Der  \r\n\r\n")).toEqual(["Hei", "Der"]);
  });
});

describe("orgMessage", () => {
  const message = orgMessage(base);

  it("is the organization's word: their name, their subject, replies to them", () => {
    expect(message.fromName).toBe("Nordnes Skolekorps");
    expect(message.subject).toBe("Takk for støtten i år!");
    expect(message.replyTo).toBe("post@eksempel.example");
  });

  it("carries the one-click decline in both text and html", () => {
    expect(message.text).toContain(base.unsubscribeUrl);
    expect(message.html).toContain(base.unsubscribeUrl);
  });

  it("renders paragraphs from blank lines, breaks from single newlines", () => {
    expect(message.html).toContain("<p>Kjære støttemedlem,</p>");
    expect(message.html).toContain("takk for at du støtter korpset.<br>Det betyr mye.");
  });

  it("escapes whatever the administrator wrote before it becomes html", () => {
    const sneaky = orgMessage({ ...base, body: "<script>alert(1)</script>" });
    expect(sneaky.html).not.toContain("<script>");
    expect(sneaky.html).toContain("&lt;script&gt;");
  });

  it("carries brand attribution with the ø visible and punycode in the href", () => {
    expect(message.html).toContain(">støttemedlem.no</a>");
    expect(message.html).toContain('href="https://xn--stttemedlem-hgb.no"');
  });
});
