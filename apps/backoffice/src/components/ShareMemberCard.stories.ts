// The invitation to share the card (specs/concepts/member-card.md), shown
// under the card on the thank-you page and at the card's own address. What
// needs reviewing is the closed button on its own, the opened row of places,
// and the two voices the shared message speaks in.
//
// What a story CANNOT show is the button's real behaviour on a phone: where
// the device has a share sheet the button opens that instead of this row, and
// these places are what a device without one falls back to. Drive the sheet
// with drive-page's `--stub`, not with a story.
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

/**
 * At the card's public address, where anybody may be the one sharing: the
 * invitation names the member whose card it is rather than "en som støtter".
 */
export const SharedByAnyone = {
  args: { ...base, voice: "anyone", memberName: "Kari Bakvendt" },
};

/** The same address for a card that carries no name: nobody is named. */
export const SharedByAnyoneUnnamed = { args: { ...base, voice: "anyone" } };

/** A long organization name in what the member sends along. */
export const LongOrgName = {
  args: { ...base, orgName: "Bakvendtland Ungdomssymfoniorkester og Musikkforening" },
};
