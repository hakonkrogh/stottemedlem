import { describe, expect, it } from "vitest";
import { membershipReceipt } from "./membershipReceipt.js";

/** Written as an escape so the rule against it can be asserted here. */
const EM_DASH = "\u2014";

const base = {
  orgName: "Bakvendtland Skolekorps",
  orgNumber: "918 654 062",
  orgContactEmail: "post@bakvendtland.example",
  memberName: "Kari Nordmann",
  memberEmail: "kari@eksempel.example",
  tierName: "Støttemedlem",
  periodText: "2026",
  periodStart: "2026-03-14",
  periodEnd: "2026-12-31",
  paidNok: 240,
  paidDate: "2026-03-14T09:30:00.000Z",
  kind: "join" as const,
  manageUrl: "https://app.example/bli-medlem/bakvendtland-skolekorps/min-side?n=tok",
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-tok",
};

describe("membershipReceipt", () => {
  it("carries the fields bokføringsforskriften § 5-1-1 nr. 2–5 requires", () => {
    const message = membershipReceipt(base);
    // nr. 2 — the parties: seller with orgnr, and the buyer by name.
    expect(message.text).toContain("Bakvendtland Skolekorps (org.nr. 918 654 062)");
    expect(message.text).toContain("Medlem: Kari Nordmann");
    // nr. 3 — what the payment was for.
    expect(message.text).toContain("Medlemskontingent («Støttemedlem»)");
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
    expect(message.fromName).toBe("Bakvendtland Skolekorps");
    expect(message.replyTo).toBe("post@bakvendtland.example");
    // Brand attribution: ø visible, punycode in the href.
    expect(message.text).toContain("støttemedlem.no");
    expect(message.html).toContain("https://xn--stttemedlem-hgb.no");
    // It cannot be declined, and says so — the way out is the membership itself.
    expect(message.text).toContain("kan ikke avmeldes");
    expect(message.text).toContain(base.manageUrl);
    // Questions go to the organization, not the unread noreply sender.
    expect(message.text).toContain("adresse som ikke leses");
    expect(message.text).toContain("kontakt Bakvendtland Skolekorps på post@bakvendtland.example");
    expect(message.html).toContain("post@bakvendtland.example");
  });

  it("reads as a renewal when the payment was one", () => {
    const message = membershipReceipt({ ...base, kind: "renewal", paidNok: 1200 });
    expect(message.subject).toBe("Kvittering: fornyet støttemedlemskap i Bakvendtland Skolekorps");
    expect(message.text).toContain("er fornyet");
    // The thousands separator is the locale's no-break space, not an ASCII one.
    expect(message.text).toContain("1 200 kr");
  });

  it("keeps the amount out of the subject, and every em dash out of the message", () => {
    const message = membershipReceipt(base);
    expect(message.subject).toBe("Kvittering: støttemedlemskap i Bakvendtland Skolekorps");
    expect(message.subject).not.toContain("kr");
    expect(message.subject).not.toContain(EM_DASH);
    expect(message.text).not.toContain(EM_DASH);
    expect(message.html).not.toContain(EM_DASH);
  });

  it("stands without the fields an organization may lack", () => {
    const message = membershipReceipt({
      ...base,
      orgNumber: null,
      orgContactEmail: null,
      memberName: null,
    });
    expect(message.text).toContain("Organisasjon: Bakvendtland Skolekorps\n");
    // A nameless buyer is still identified — by the address the receipt went to.
    expect(message.text).toContain("Medlem: kari@eksempel.example");
    expect(message.replyTo).toBeUndefined();
    expect(message.text).toContain("ta kontakt med Bakvendtland Skolekorps direkte");
    expect(message.html).not.toContain("org.nr.");
  });
});

describe("membershipReceipt — the member's card", () => {
  it("offers the card before it says anything about the receipt", () => {
    const message = membershipReceipt(base);
    const cardAt = message.text.indexOf(base.cardUrl);
    const receiptAt = message.text.indexOf("Dette er kvitteringen din");
    expect(cardAt).toBeGreaterThan(-1);
    expect(cardAt).toBeLessThan(receiptAt);
    expect(message.html.indexOf(base.cardUrl)).toBeLessThan(
      message.html.indexOf("Dette er kvitteringen din"),
    );
  });

  it("links the card without drawing anything that looks like one", () => {
    const message = membershipReceipt(base);
    expect(message.text).toContain("Se og del medlemsbeviset ditt");
    expect(message.html).toContain(`href="${base.cardUrl}"`);
    // No card facsimile: no hearts, no name plate, no valid-year line.
    expect(message.text).not.toContain("❤️❤️");
    expect(message.text).not.toContain("som støttemedlem");
    expect(message.text).not.toContain("Gyldig");
    expect(message.html).not.toContain("STØTTEMEDLEM");
    expect(message.html).not.toContain("Gyldig");
  });

  it("says the card is attached only when it really is", () => {
    expect(membershipReceipt(base).text).not.toContain("ligger vedlagt");
    const withCard = membershipReceipt({ ...base, cardPngBase64: "aGVsbG8=" });
    expect(withCard.text).toContain("Medlemsbeviset ditt ligger vedlagt");
    expect(withCard.text).toContain(base.cardUrl);
  });

  it("attaches the card as a picture when one could be drawn, and not otherwise", () => {
    expect(membershipReceipt(base).attachments).toBeUndefined();
    const withCard = membershipReceipt({ ...base, cardPngBase64: "aGVsbG8=" });
    expect(withCard.attachments).toEqual([
      { filename: "medlemsbevis.png", contentBase64: "aGVsbG8=", contentType: "image/png" },
    ]);
  });
});
