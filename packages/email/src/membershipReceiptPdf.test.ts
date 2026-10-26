import { inflateSync } from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { membershipReceiptPdf } from "./membershipReceiptPdf.js";
import type { MembershipReceipt } from "./receiptFacts.js";

const base: MembershipReceipt = {
  orgName: "Bakvendtland Skolekorps",
  orgNumber: "918 654 062",
  orgContactEmail: "post@bakvendtland.example",
  memberName: "Kari Nordmann",
  memberEmail: "kari@eksempel.example",
  tierName: "Støttemedlem",
  periodText: "2026",
  periodStart: "2026-03-14",
  periodEnd: "2026-12-31",
  paidNok: 1200,
  paidDate: "2026-03-14T09:30:00.000Z",
  kind: "join",
  manageUrl: "https://app.example/bli-medlem/bakvendtland-skolekorps/min-side?n=tok",
  receiptUrl: "https://app.example/bli-medlem/bakvendtland-skolekorps/kvittering?n=tok",
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-tok",
};

/**
 * Every string the document draws, decoded from its content streams. The
 * standard fonts write WinAnsi bytes, which is Windows-1252.
 */
async function drawnText(bytes: Uint8Array): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const chunks: string[] = [];
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    // Content streams carry no /Type; fonts and the like do.
    if (object.dict.has(PDFName.of("Type"))) continue;
    const raw =
      object.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode")
        ? inflateSync(object.contents)
        : Buffer.from(object.contents);
    chunks.push(raw.toString("latin1"));
  }
  // Text operands are "<hex> Tj"; each byte pair is one WinAnsi character.
  return [...chunks.join("\n").matchAll(/<([0-9A-Fa-f]+)> Tj/g)]
    .map((m) => new TextDecoder("windows-1252").decode(Buffer.from(m[1] ?? "", "hex")))
    .join("\n");
}

describe("membershipReceiptPdf", () => {
  it("is one A4 page that says what the receipt must say", async () => {
    const bytes = await membershipReceiptPdf(base);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe("Kvittering: Bakvendtland Skolekorps");

    const text = await drawnText(bytes);
    expect(text).toContain("Kvittering");
    // nr. 2 — the parties.
    expect(text).toContain("Bakvendtland Skolekorps (org.nr. 918 654 062)");
    expect(text).toContain("Kari Nordmann");
    // nr. 3 — what for.
    expect(text).toContain("Medlemskontingent («Støttemedlem»)");
    // nr. 4 — the period.
    expect(text).toContain("14. mars 2026 – 31. desember 2026 (2026)");
    // nr. 5 — amount and date, with the locale's no-break space.
    expect(text).toContain("1 200 kr den 14. mars 2026, via Vipps");
    expect(text).toContain("medlemskontingent er unntatt mva");
    expect(text).toContain("post@bakvendtland.example");
    expect(text).toContain("støttemedlem.no");
    expect(text).not.toContain("§");
  });

  it("reads as a renewal when the payment was one", async () => {
    const text = await drawnText(await membershipReceiptPdf({ ...base, kind: "renewal" }));
    expect(text).toContain("Fornyet støttemedlemskap i Bakvendtland Skolekorps");
  });

  it("sets a name the standard font cannot, rather than failing the receipt", async () => {
    const bytes = await membershipReceiptPdf({ ...base, memberName: "Łukasz Şahin Ægir" });
    const text = await drawnText(bytes);
    expect(text).toContain("?ukasz Sahin Ægir");
  });

  it("wraps a long organization name instead of running off the page", async () => {
    const name =
      "Bakvendtland og Omegn Skolekorps, Drilltropp og Aspirantkorps med Venner, Foreldre og Støttespillere";
    const bytes = await membershipReceiptPdf({ ...base, orgName: name, orgNumber: null });
    const text = await drawnText(bytes);
    // The name is all there, and nowhere on one line: the page is about 96
    // characters wide at the smallest size the receipt uses.
    expect(text.replace(/\n/g, " ")).toContain(name);
    expect(text.split("\n").every((line) => line.length <= 100)).toBe(true);
  });
});
