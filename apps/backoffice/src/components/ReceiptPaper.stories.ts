// The receipt slip on the confirmation page (specs/concepts/payment-receipt.md):
// white paper torn top and bottom, lying on the cream page. What needs
// reviewing is the paper itself — the torn edges, the shadow following them —
// and how the slip carries awkward content: a member with no name, values long
// enough to wrap.
import ReceiptPaperStory from "./ReceiptPaperStory.astro";

/** Fictitious — a committed fixture must never carry a real organization. */
const base = {
  seller: "Eksempel Musikkorps (org.nr. 123 456 789)",
  memberLabel: "Kari Eksempel",
  what: "Medlemskontingent — «Støttemedlem»",
  period: "14. mars 2026 – 31. desember 2026 (2026)",
  paid: "250 kr den 14. mars 2026, via Vipps",
};

export default {
  title: "Backoffice/Kvittering",
  component: ReceiptPaperStory,
};

/** The ordinary receipt, as the page shows it after a confirmed payment. */
export const Default = { args: base };

/** A member who shared neither name nor email — the line shows a muted dash. */
export const WithoutName = { args: { ...base, memberLabel: null } };

/** Long values wrap inside the slip instead of widening it. */
export const LongValues = {
  args: {
    ...base,
    seller: "Vestbygda Skolekorps og Ungdomsorkester (org.nr. 987 654 321)",
    memberLabel: "anne-margrethe.wollertsen.bjornstad@eksempel-epostadresse.no",
    what: "Medlemskontingent — «Gull-støttemedlem med ekstra lang tittel»",
  },
};
