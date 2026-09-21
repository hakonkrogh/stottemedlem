// The thank-you page's invitation to share the card
// (specs/concepts/member-card.md): one button that says what it is for, and
// under it the places the card can go. What needs reviewing is the closed
// button on its own and the opened row of places; the "Andre apper" place
// only appears on a device with a share sheet, so it is absent here.
import ShareMemberCard from "./ShareMemberCard.astro";

/** Fictitious: a committed fixture must never carry a real organization. */
const base = {
  cardUrl: "https://xn--stttemedlem-hgb.no/medlemsbevis/kort-m-1",
  orgName: "Bakvendtland Skolekorps",
};

export default {
  title: "Backoffice/Del medlemsbeviset",
  component: ShareMemberCard,
};

/** As the page shows it: closed, one clear action. */
export const Closed = { args: base };

/** A long organization name in what the member sends along. */
export const LongOrgName = {
  args: { ...base, orgName: "Bakvendtland Ungdomssymfoniorkester og Musikkforening" },
};
