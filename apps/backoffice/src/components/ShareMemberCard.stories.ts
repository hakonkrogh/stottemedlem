// The invitation to share the card (specs/concepts/member-card.md), shown
// under the card on the thank-you page and at the card's own address. What
// needs reviewing is the closed button on its own, the opened row of places,
// and the two voices the shared message speaks in. The "Andre apper" place
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

/** As the member's own pages show it: closed, one clear action. */
export const Closed = { args: base };

/** At the card's public address, where anybody may be the one sharing. */
export const SharedByAnyone = { args: { ...base, voice: "anyone" } };

/** A long organization name in what the member sends along. */
export const LongOrgName = {
  args: { ...base, orgName: "Bakvendtland Ungdomssymfoniorkester og Musikkforening" },
};
