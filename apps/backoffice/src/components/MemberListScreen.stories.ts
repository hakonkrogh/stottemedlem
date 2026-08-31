// Screen stories render inside the org chrome the app ships (StoryScreen wraps
// OrgScreen), so Storybook shows the screen exactly as it ships — and every
// link leads to the story showing the screen behind it.
import type { MemberOverview } from "@stottemedlem/db";
import MemberListScreen from "./MemberListScreen.astro";
import { continuing, everyone } from "./memberFixtures";
import StoryScreen from "./StoryScreen.astro";
import { ORG_PATH } from "./storyFixtures";

export default {
  title: "Backoffice/Medlemsliste",
  component: StoryScreen,
};

interface ScreenProps {
  members: MemberOverview[];
  search?: string;
  filter?: string | null;
  membersPath: string;
  exportHref?: string;
  currentYear: number;
}

const inFrame = (props: Partial<ScreenProps>) => ({
  active: "medlemmer",
  warnings: [],
  slots: {
    default: {
      component: MemberListScreen,
      props: {
        members: everyone,
        membersPath: `${ORG_PATH}/medlemmer`,
        exportHref: `${ORG_PATH}/medlemmer/eksport.csv`,
        currentYear: 2026,
        ...props,
      },
    },
  },
});

export const Default = { args: inFrame({}) };

/** What an organization sees before its first supporter joins. */
export const NoMembersYet = { args: inFrame({ members: [] }) };

/** Searching narrows the list; the counts above it deliberately do not move. */
export const Searching = { args: inFrame({ search: "solheim" }) };

/** A search nobody matches still offers the way back. */
export const SearchWithNoMatch = { args: inFrame({ search: "kvitfjell" }) };

/** The question this screen was asked for: who is about to stop supporting us. */
export const OnlyEnding = { args: inFrame({ filter: "slutter" }) };

/** Both kinds of current supporter together — the pill counts stay whole-register. */
export const OnlyActive = { args: inFrame({ filter: "aktive" }) };

/** The ones to invite back. */
export const OnlyLapsed = { args: inFrame({ filter: "utlopt" }) };

/** Narrowing and searching compose; either one can be what emptied the list. */
export const FilteredAndSearching = {
  args: inFrame({ filter: "fornyes", search: "solheim" }),
};

/** A standing nobody has right now still names itself rather than going blank. */
export const FilterWithNoMatch = {
  args: inFrame({ members: [continuing], filter: "utlopt" }),
};
