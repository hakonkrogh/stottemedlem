// The printable sheets, drawn from real cards: the story is the review loop
// for the printout, since the page itself sits behind the back-office login.
import { CANONICAL_ORIGIN, memberScanUrl } from "@stottemedlem/core";
import { memberCardSvg } from "@stottemedlem/qr";
import { FIXTURE_LOGO_URL } from "@stottemedlem/ui/components/OrgIdentityHeader.fixtures.ts";
import { envelopeLines } from "../lib/envelope";
import MemberCardSheetsScreen, { type PrintedCard } from "./MemberCardSheetsScreen.astro";
import { ORG, ORG_PATH } from "./storyFixtures";

export default {
  title: "Backoffice/Medlemsbevis til utskrift",
  component: MemberCardSheetsScreen,
};

const membersPath = `${ORG_PATH}/medlemmer`;
const printPath = `${membersPath}/medlemsbevis`;

// Fictitious supporters, enough of them to need a third sheet.
const NAMES = [
  "Ingrid Solheim",
  "Bjørn Aas",
  "Marit Fjeld",
  "Ola Nordmann",
  "Kari Nordmann",
  "Anne-Lise Bakke-Johansen",
  "Per Olav Strand",
  "Siri Haugen",
  "Tor Erik Vik",
  "Liv Marie Sæther",
  "Håkon Berg",
  "Astrid Lund",
  "Jon Inge Moe",
  "Guro Nygård",
];

// Fictitious streets in the one invented town, so the envelope lines under
// the cards are as made up as the names on them. Every third member gave no
// address, and one gave no phone: the sheet has to say so where it matters.
const STREETS = ["Bakvendtveien", "Speilgata", "Opp-ned-stien", "Vrangsida"];
function address(index: number) {
  if (index % 3 === 2) return {};
  return {
    streetAddress: `${STREETS[index % STREETS.length]} ${index + 1}`,
    postalCode: "9999",
    city: "Bakvendtland",
    country: index === 4 ? "Sverige" : "NO",
  };
}
function phone(index: number): string | null {
  return index === 7 ? null : `47${String(90000000 + index * 1234567).slice(0, 8)}`;
}

function card(
  name: string | null,
  index: number,
  periodText: string,
  postalAddresses = true,
): PrintedCard {
  const token = `5eed0001-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const { streetAddress = null, postalCode = null, city = null, country = null } = address(index);
  return {
    envelopeLines: envelopeLines(
      { streetAddress, postalCode, city, country, phone: phone(index) },
      postalAddresses,
    ),
    svg: memberCardSvg({
      memberName: name,
      memberNumber: index + 1,
      organizationName: ORG.name,
      hearts: (index % 5) + 1,
      recruits: index % 3,
      lapsed: false,
      periodText,
      joinUrl:
        memberScanUrl(CANONICAL_ORIGIN, token) ?? `${CANONICAL_ORIGIN}/bli-medlem/${ORG.slug}`,
      logoDataUri: FIXTURE_LOGO_URL,
    }),
  };
}

const choices = (current: string) =>
  ["2026", "2025", "2024"].map((label) => ({
    label,
    href: `${printPath}?periode=${label}`,
    current: label === current,
  }));

/**
 * Three sheets: two full, one with the last two cards. Under each card, the
 * address for the envelope, and "Adresse mangler" where a member never gave one.
 */
export const ThisYear = {
  args: {
    cards: NAMES.map((name, index) => card(name, index, "2026")),
    periodLabel: "2026",
    periodChoices: choices("2026"),
    backHref: membersPath,
  },
};

/**
 * An organization that opted out of addresses
 * (specs/use-cases/collect-postal-addresses.md): no note where an address
 * would have been, and only the addresses still held from before.
 */
export const OptedOutOfAddresses = {
  args: {
    cards: NAMES.map((name, index) => card(name, index, "2026", false)),
    periodLabel: "2026",
    periodChoices: choices("2026"),
    backHref: membersPath,
  },
};

/** Last year's cards, as they stood then: fewer members, fewer hearts. */
export const LastYear = {
  args: {
    cards: NAMES.slice(0, 5).map((name, index) => card(name, index, "2025")),
    periodLabel: "2025",
    periodChoices: choices("2025"),
    backHref: membersPath,
  },
};

/** A supporter who consented to no name still gets a card. */
export const OneSheet = {
  args: {
    cards: [
      ...NAMES.slice(0, 3).map((name, index) => card(name, index, "2026")),
      card(null, 3, "2026"),
    ],
    periodLabel: "2026",
    periodChoices: choices("2026"),
    backHref: membersPath,
  },
};

/** Nothing paid for the chosen period: the page says so and prints nothing. */
export const NobodyPaid = {
  args: {
    cards: [],
    periodLabel: "2024",
    periodChoices: choices("2024"),
    backHref: membersPath,
  },
};
