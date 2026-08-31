// What a member's standing is CALLED, and the pills the member list can be
// narrowed by (specs/use-cases/curate-member-list.md).
//
// The standing itself is derived in @stottemedlem/db; this is only the words
// and the filters around it — kept in one place so the list row, the member's
// own page and the spreadsheet never disagree about what a member is.
import {
  isCurrentMember,
  type MemberOverview,
  type MemberStanding,
  memberStanding,
} from "@stottemedlem/db";

/**
 * The short form, for a pill beside a name. Both current standings lead with
 * "Aktiv": whether support continues is the second half of the answer, not a
 * different answer — someone who has ended their arrangement is still a member
 * until their paid period runs out.
 */
export const standingLabel: Record<MemberStanding, string> = {
  renewing: "Aktiv · fornyes",
  ending: "Aktiv · slutter",
  lapsed: "Utløpt",
  unpaid: "Ikke betalt",
};

/** The same four, spelled out where there is room for a sentence. */
export const standingDescription: Record<MemberStanding, string> = {
  renewing: "Den årlige avtalen løper, så neste periode kommer av seg selv.",
  ending: "Den årlige avtalen er avsluttet, så medlemskapet fornyes ikke.",
  lapsed: "Perioden er over, og ingen ny er betalt.",
  unpaid: "Ingen betaling er fullført ennå.",
};

/** One way to narrow the list. `key` is what appears in the web address. */
export interface MemberFilter {
  key: string;
  label: string;
  matches: (entry: MemberOverview) => boolean;
}

const is = (standing: MemberStanding) => (entry: MemberOverview) =>
  memberStanding(entry) === standing;

const EVERYONE: MemberFilter = { key: "alle", label: "Alle", matches: () => true };

/**
 * Best news first, and "Aktive" deliberately overlaps the two standings under
 * it: "who supports us right now" and "who is about to stop" are both real
 * questions, and an administrator should not have to add two numbers to answer
 * the first one.
 */
export const MEMBER_FILTERS: MemberFilter[] = [
  EVERYONE,
  { key: "aktive", label: "Aktive", matches: isCurrentMember },
  { key: "fornyes", label: "Fornyes", matches: is("renewing") },
  { key: "slutter", label: "Slutter", matches: is("ending") },
  { key: "utlopt", label: "Utløpt", matches: is("lapsed") },
  { key: "ikke-betalt", label: "Ikke betalt", matches: is("unpaid") },
];

/**
 * Which filter an address asks for. An unknown or absent key is the whole list
 * rather than an error: a member list that refuses to render because someone
 * mistyped a query parameter helps nobody.
 */
export function memberFilterFor(key: string | null | undefined): MemberFilter {
  const wanted = key?.trim().toLowerCase();
  return MEMBER_FILTERS.find((filter) => filter.key === wanted) ?? EVERYONE;
}
