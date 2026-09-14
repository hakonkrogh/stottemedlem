// The member's card ARRIVING (specs/concepts/member-card.md,
// specs/concepts/opening-a-page.md).
//
// The card is a picture fetched over the network, and a card being drawn for
// the first time costs the best part of a second. What a reviewer needs to see
// here is not the artwork (Medlemsbevis is that story) but the
// half-second nobody can catch on a real page: does the skeleton stand in the
// card's own shape, is its heart where the drawn heart lands, and does the
// card arrive without anything jumping?
//
// `Arriving` replays that moment on a loop. `Waiting` and `Ready` hold each
// end still, which is what you screenshot.
//
// See MemberCardLoadingStory.astro for why the story drives the state itself
// instead of waiting on an address Storybook does not serve.
import MemberCardLoadingStory from "./MemberCardLoadingStory.astro";

/** Fictitious: a committed fixture must never carry a real organization's mark. */
const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABCUlEQVR42u2asRXDIAxEb4y0qbP/HlkjE6T1BoAFkk5nvUdt/w8FSDr8f9/SC2c/93m/potOYAXaTwZZ6Kc0kIu+rwEG9B0N8KDbNEBIf8sBnPTrDqClX3QAM/2KA8jppw7gpx87oAT9wAEe9H6n6isQcCfOBSKfMUf+tSsQ/xofCcTT7//XLhBfyk0EEul3ACwCfhW6XSB9+80Y4Nl+G8nDBGJ6VbcFeLbfcAhPEojseLZAC7RAC7QAn0DfxG4C5R9zXQ+UEiAtKcsX9QptlfKNLYXWYvnmrkJ7vfyAQ2HEVH7IpzBmVRh0K0QNFMIeCnEbhcCTQuRMIfQnErsUCb6KRI9Fwt+56wKF4QaIff1TIAAAAABJRU5ErkJggg==";

const base = {
  memberName: "Kari Eksempel",
  memberNumber: 42,
  organizationName: "Bakvendtland Skolekorps",
  hearts: 4,
  periodText: "2026",
  joinUrl: "HTTPS://XN--STTTEMEDLEM-HGB.NO/V/8P2K4RTZQ9VWXB6MN3HJD5CFG7",
  logoDataUri: LOGO,
};

export default {
  title: "Backoffice/Medlemsbevis lastes",
  component: MemberCardLoadingStory,
};

/**
 * The whole point: skeleton, then card, then skeleton again. Nothing may move
 * between the two, the heart least of all: it should gain its colour and
 * its count without shifting a pixel.
 */
export const Arriving = { args: { ...base, play: "loop" } };

/**
 * The waiting card, held still. The heart beats at a resting pulse; every
 * other shape is a bar where a line of the card will land.
 */
export const Waiting = { args: { ...base, play: "loading" } };

/** The far end: the card, with the skeleton gone. */
export const Ready = { args: { ...base, play: "ready" } };

/**
 * A member with a recruit line and a two-digit streak. The skeleton grows the
 * same extra line the card does, so the heart stays put in both.
 */
export const ArrivingWithRecruits = {
  args: { ...base, hearts: 12, recruits: 3, play: "loop" },
};

/**
 * The first year, no logo and no recruit line: the shortest card there is, and
 * the one where a skeleton built to average proportions would miss the heart.
 */
export const ArrivingFirstYear = {
  args: { ...base, hearts: 1, memberNumber: 1, logoDataUri: null, play: "loop" },
};

/**
 * A long name on both halves. The member's name steps down a size, so the
 * block above the heart is shorter, and the skeleton, laid out by the card's
 * own code, steps down with it.
 */
export const ArrivingLongNames = {
  args: {
    ...base,
    memberName: "Anne-Margrethe Wollertsen Bjørnstad",
    organizationName: "Bakvendtland Korps og Ungdomsorkester",
    hearts: 7,
    play: "loop",
  },
};
