import { describe, expect, it } from "vitest";
import { membershipReceipt } from "./membershipReceipt.js";

const base = {
  orgName: "Eksempel Musikkorps",
  orgNumber: "918 654 062",
  orgContactEmail: "post@eksempel.example",
  memberName: "Kari Nordmann",
  memberEmail: "kari@eksempel.example",
  tierName: "Støttemedlem",
  periodText: "2026",
  periodStart: "2026-03-14",
  periodEnd: "2026-12-31",
  paidNok: 240,
  paidDate: "2026-03-14T09:30:00.000Z",
  kind: "join" as const,
  manageUrl: "https://app.example/bli-medlem/eksempel/min-side?n=tok",
  hearts: 3,
  recruits: 0,
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-tok",
};

describe("membershipReceipt", () => {
  it("carries the fields bokføringsforskriften § 5-1-1 nr. 2–5 requires", () => {
    const message = membershipReceipt(base);
    // nr. 2 — the parties: seller with orgnr, and the buyer by name.
    expect(message.text).toContain("Eksempel Musikkorps (org.nr. 918 654 062)");
    expect(message.text).toContain("Medlem: Kari Nordmann");
    // nr. 3 — what the payment was for.
    expect(message.text).toContain("Medlemskontingent — «Støttemedlem»");
    // nr. 4 — the period delivered.
    expect(message.text).toContain("14. mars 2026 – 31. desember 2026 (2026)");
    // nr. 5 — amount and payment date.
    expect(message.text).toContain("240 kr den 14. mars 2026, via Vipps");
    // The VAT exemption is stated in plain words — the receipt adheres to
    // the law without citing it at the member.
    expect(message.text).toContain("medlemskontingent er unntatt mva");
    expect(message.text).not.toContain("§");
    expect(message.html).not.toContain("§");
  });

  it("addresses and attributes like every member notice", () => {
    const message = membershipReceipt(base);
    expect(message.to).toBe("kari@eksempel.example");
    expect(message.fromName).toBe("Eksempel Musikkorps");
    expect(message.replyTo).toBe("post@eksempel.example");
    // Brand attribution: ø visible, punycode in the href.
    expect(message.text).toContain("støttemedlem.no");
    expect(message.html).toContain("https://xn--stttemedlem-hgb.no");
    // It cannot be declined, and says so — the way out is the membership itself.
    expect(message.text).toContain("kan ikke avmeldes");
    expect(message.text).toContain(base.manageUrl);
    // Questions go to the organization, not the unread noreply sender.
    expect(message.text).toContain("adresse som ikke leses");
    expect(message.text).toContain("kontakt Eksempel Musikkorps på post@eksempel.example");
    expect(message.html).toContain("post@eksempel.example");
  });

  it("reads as a renewal when the payment was one", () => {
    const message = membershipReceipt({ ...base, kind: "renewal", paidNok: 1200 });
    // The thousands separator is the locale's no-break space, not an ASCII one.
    expect(message.subject).toBe(
      "Kvittering: fornyet støttemedlemskap i Eksempel Musikkorps — 1 200 kr",
    );
    expect(message.text).toContain("er fornyet");
  });

  it("stands without the fields an organization may lack", () => {
    const message = membershipReceipt({
      ...base,
      orgNumber: null,
      orgContactEmail: null,
      memberName: null,
    });
    expect(message.text).toContain("Organisasjon: Eksempel Musikkorps\n");
    // A nameless buyer is still identified — by the address the receipt went to.
    expect(message.text).toContain("Medlem: kari@eksempel.example");
    expect(message.replyTo).toBeUndefined();
    expect(message.text).toContain("ta kontakt med Eksempel Musikkorps direkte");
    expect(message.html).not.toContain("org.nr.");
  });
});

describe("membershipReceipt — the member's card", () => {
  it("leads with the card, and puts the bookkeeping after it", () => {
    const message = membershipReceipt(base);
    // The card comes first: the receipt is what the law wants, the card is
    // what the member wants (specs/concepts/member-card.md).
    const cardAt = message.text.indexOf("DITT MEDLEMSBEVIS");
    const receiptAt = message.text.indexOf("Medlemskontingent");
    expect(cardAt).toBeGreaterThan(-1);
    expect(cardAt).toBeLessThan(receiptAt);
    expect(message.html.indexOf("STØTTEMEDLEM")).toBeLessThan(
      message.html.indexOf("Medlemskontingent"),
    );
  });

  it("draws one heart per supported year and links the shareable address", () => {
    const message = membershipReceipt(base);
    expect(message.text).toContain("❤️❤️❤️");
    expect(message.text).toContain("3 år som støttemedlem");
    expect(message.text).toContain(base.cardUrl);
    expect(message.html).toContain(base.cardUrl);
  });

  it("breaks the hearts into rows of ten, like every other surface", () => {
    const message = membershipReceipt({ ...base, hearts: 12 });
    expect(message.text).toContain(`${"❤️".repeat(10)}\n${"❤️".repeat(2)}`);
  });

  it("mentions recruits only once there are any", () => {
    expect(membershipReceipt(base).text).not.toContain("vervet");
    const recruited = membershipReceipt({ ...base, recruits: 1 });
    expect(recruited.text).toContain("vervet 1 medlem");
    expect(membershipReceipt({ ...base, recruits: 2 }).text).toContain("vervet 2 medlemmer");
  });

  it("attaches the card as a picture when one could be drawn, and not otherwise", () => {
    expect(membershipReceipt(base).attachments).toBeUndefined();
    const withCard = membershipReceipt({ ...base, cardPngBase64: "aGVsbG8=" });
    expect(withCard.attachments).toEqual([
      { filename: "medlemsbevis.png", contentBase64: "aGVsbG8=", contentType: "image/png" },
    ]);
  });
});
