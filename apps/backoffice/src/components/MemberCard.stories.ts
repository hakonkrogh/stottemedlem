// The member's card (specs/concepts/member-card.md). There is exactly one, and
// it is upright — a phone is where a member looks at it and where its QR code
// gets held up to a camera.
// It is the one surface a supporting member shows to strangers, so what needs
// reviewing here is whether it still reads well when the inputs are awkward:
// a very long name, a two-digit streak, an organization with no logo, a
// membership that has lapsed.
//
// Rendered from the real `memberCardSvg` output — see MemberCardStory.astro
// for why the story cannot use the shipped MemberCardFigure component.
import MemberCardStory from "./MemberCardStory.astro";

/** Fictitious — a committed fixture must never carry a real organization's mark. */
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABCUlEQVR42u2asRXDIAxEb4y0qbP/HlkjE6T1BoAFkk5nvUdt/w8FSDr8f9/SC2c/93m/potOYAXaTwZZ6Kc0kIu+rwEG9B0N8KDbNEBIf8sBnPTrDqClX3QAM/2KA8jppw7gpx87oAT9wAEe9H6n6isQcCfOBSKfMUf+tSsQ/xofCcTT7//XLhBfyk0EEul3ACwCfhW6XSB9+80Y4Nl+G8nDBGJ6VbcFeLbfcAhPEojseLZAC7RAC7QAn0DfxG4C5R9zXQ+UEiAtKcsX9QptlfKNLYXWYvnmrkJ7vfyAQ2HEVH7IpzBmVRh0K0QNFMIeCnEbhcCTQuRMIfQnErsUCb6KRI9Fwt+56wKF4QaIff1TIAAAAABJRU5ErkJggg==";

const base = {
  memberName: "Kari Eksempel",
  organizationName: "Eksempel Musikkorps",
  hearts: 4,
  periodText: "2026",
  joinUrl: "https://xn--stttemedlem-hgb.no/bli-medlem/eksempel-musikkorps?verva=kort-1",
};

export default {
  title: "Backoffice/Medlemsbevis",
  component: MemberCardStory,
};

/** The ordinary card: a few years in, an organization with its own mark. */
export const WithLogo = { args: { ...base, logoDataUri: LOGO } };

/** No logo uploaded yet — the name takes the whole width instead. */
export const WithoutLogo = { args: base };

/** The first year. A streak of one, and nothing pretending there should be more. */
export const FirstYear = { args: { ...base, hearts: 1, logoDataUri: LOGO } };

/** Word of mouth paying off — the recruit count only appears once it is above zero. */
export const WithRecruits = { args: { ...base, hearts: 6, recruits: 3, logoDataUri: LOGO } };

/** Two digits in the streak heart — the number shrinks to stay inside. */
export const DoubleDigit = { args: { ...base, hearts: 12, logoDataUri: LOGO } };

/** A decade and more, with everything else on the card at once. */
export const LongLoyalty = { args: { ...base, hearts: 34, recruits: 12, logoDataUri: LOGO } };

/** Stopped supporting: the streak stays — those years were real — but the cheer goes. */
export const Lapsed = {
  args: { ...base, hearts: 3, periodText: "2024", lapsed: true, logoDataUri: LOGO },
};

/** A supporter who shared no name; the card still stands. */
export const WithoutName = { args: { ...base, memberName: null, logoDataUri: LOGO } };

/** A name too long for the band even at two lines wraps onto three, still between words. */
export const VeryLongOrgName = {
  args: {
    ...base,
    organizationName: "Sør-Trøndelag Ungdomssymfoniorkester og Musikkforening",
    hearts: 2,
    logoDataUri: LOGO,
  },
};

/** The stress case: the organization's name breaks onto two lines, the member's shrinks. */
export const LongNames = {
  args: {
    ...base,
    memberName: "Anne-Margrethe Wollertsen Bjørnstad",
    organizationName: "Vestbygda Skolekorps og Ungdomsorkester",
    hearts: 7,
    logoDataUri: LOGO,
  },
};
