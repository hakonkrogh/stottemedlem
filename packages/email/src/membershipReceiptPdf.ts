import { PageSizes, PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { type MembershipReceipt, receiptRows } from "./receiptFacts.js";

const BRAND_NAME = "støttemedlem.no";

const INK = rgb(0.169, 0.129, 0.094);
const MUTED = rgb(0.42, 0.365, 0.302);

const MARGIN = 56;
const BODY_SIZE = 11;
const LINE = 16;

/**
 * The receipt as a document of its own: one A4 page saying what the receipt
 * email used to say in its body (specs/concepts/payment-receipt.md). The
 * email is a thank-you now, and the paperwork rides along as a file the
 * member can save, print and hand to whoever keeps their books.
 *
 * Set in the PDF standard Helvetica, which every reader has and nothing needs
 * to be embedded for. That face knows Western Latin only, so a name written
 * in letters outside it is set without its accents, or with a question mark
 * where a letter has no plain form, rather than failing the whole receipt:
 * the card carries the name as the member wrote it.
 */
export async function membershipReceiptPdf(receipt: MembershipReceipt): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Kvittering: ${receipt.orgName}`);
  pdf.setSubject(`Medlemskontingent, ${receipt.periodText}`);
  pdf.setAuthor(receipt.orgName);
  pdf.setProducer(BRAND_NAME);
  pdf.setCreator(BRAND_NAME);
  pdf.setLanguage("nb-NO");
  pdf.setCreationDate(new Date(receipt.paidDate));

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(PageSizes.A4);
  const width = page.getWidth() - MARGIN * 2;
  let y = page.getHeight() - MARGIN;

  const write = (text: string, font: PDFFont, size: number, x = MARGIN, color = INK) => {
    page.drawText(encodable(text, font), { x, y, size, font, color });
  };

  write("Kvittering", bold, 22);
  y -= 30;
  const subtitle =
    receipt.kind === "join"
      ? `Støttemedlemskap i ${receipt.orgName}`
      : `Fornyet støttemedlemskap i ${receipt.orgName}`;
  for (const line of wrap(subtitle, regular, 13, width)) {
    write(line, regular, 13, MARGIN, MUTED);
    y -= 18;
  }
  y -= 22;

  const labelWidth = 110;
  for (const [label, value] of receiptRows(receipt)) {
    const lines = wrap(value, regular, BODY_SIZE, width - labelWidth);
    write(label, regular, BODY_SIZE, MARGIN, MUTED);
    for (const line of lines) {
      write(line, regular, BODY_SIZE, MARGIN + labelWidth);
      y -= LINE;
    }
    y -= 6;
  }

  y -= 18;
  const contact = receipt.orgContactEmail
    ? `Har du spørsmål om betalingen, kontakt ${receipt.orgName} på ${receipt.orgContactEmail}.`
    : `Har du spørsmål om betalingen, ta kontakt med ${receipt.orgName} direkte.`;
  for (const paragraph of [
    "Dette er kvitteringen for en gjennomført betaling av medlemskontingent.",
    contact,
    `Sendt via ${BRAND_NAME} på vegne av ${receipt.orgName}.`,
  ]) {
    for (const line of wrap(paragraph, regular, 10, width)) {
      write(line, regular, 10, MARGIN, MUTED);
      y -= 14;
    }
    y -= 4;
  }

  return pdf.save();
}

/** Break on spaces so that no line is wider than `maxWidth` at `size`. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(encodable(candidate, font), size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const charsets = new WeakMap<PDFFont, Set<number>>();

/**
 * The text as the font can set it. A standard font encodes Western Latin
 * (WinAnsi) and throws on anything else, so a letter it lacks is reduced to
 * its base letter where one exists ("ł" has none; "ş" becomes "s"), and to a
 * question mark otherwise, instead of the whole receipt failing on a name.
 */
function encodable(text: string, font: PDFFont): string {
  let known = charsets.get(font);
  if (!known) {
    known = new Set(font.getCharacterSet());
    charsets.set(font, known);
  }
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (known.has(code)) {
      out += char;
      continue;
    }
    const plain = char.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    out += plain && [...plain].every((c) => known.has(c.codePointAt(0) ?? 0)) ? plain : "?";
  }
  return out;
}
