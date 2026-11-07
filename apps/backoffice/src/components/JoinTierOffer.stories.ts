// A membership on the join page (specs/concepts/join-page.md), closed and
// opened. The press itself works here too; the movement and the double-tap
// guard are proven with drive-page against the real page.
import JoinTierOffer from "./JoinTierOffer.astro";

/** Fictitious: a committed fixture must never carry a real organization. */
const base = {
  name: "Støttemedlem",
  annualFeeNok: 300,
  tierKey: "stottemedlem",
  action: "/bli-medlem/bakvendtland-skolekorps/start",
  todayNok: 45,
  periodName: "2026",
  renewalDate: "1. januar 2027",
};

export default {
  title: "Backoffice/Bli medlem-kortet",
  component: JoinTierOffer,
};

/** As the page opens: the yearly price, and what today costs. */
export const Closed = { args: base };

/** After the first press: the two dates, and the button that pays. */
export const Opened = { args: { ...base, open: true } };

/** A description the organization wrote stays on the card when it opens. */
export const OpenedWithDescription = {
  args: {
    ...base,
    open: true,
    description: "Du støtter korpset og står på listen vår over støttemedlemmer.",
  },
};

/** Joining on the first day of a period costs the full fee. */
export const FullPriceToday = { args: { ...base, todayNok: 300, open: true } };

/** Long numbers must not wrap or push the words out. */
export const LargeAmounts = {
  args: { ...base, annualFeeNok: 12000, todayNok: 1800, open: true },
};
