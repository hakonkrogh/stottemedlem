// The printable sheets, drawn from real cards: the story is the review loop
// for the printout, since the page itself sits behind the back-office login.
import { CANONICAL_ORIGIN, memberScanUrl } from "@stottemedlem/core";
import { memberCardSvg } from "@stottemedlem/qr";
import { FIXTURE_LOGO_URL } from "@stottemedlem/ui/components/OrgIdentityHeader.fixtures.ts";
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

function card(name: string | null, index: number, periodText: string): PrintedCard {
  const token = `5eed0001-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  return {
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

/** Three sheets: two full, one with the last two cards. */
export const ThisYear = {
  args: {
    cards: NAMES.map((name, index) => card(name, index, "2026")),
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
