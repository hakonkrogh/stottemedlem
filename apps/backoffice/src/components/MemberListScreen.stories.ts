// Screen stories render inside the org chrome the app ships (StoryScreen wraps
// OrgScreen), so Storybook shows the screen exactly as it ships — and every
// link leads to the story showing the screen behind it.
import type { MemberOverview } from "@stottemedlem/db";
import MemberListScreen from "./MemberListScreen.astro";
import { everyone } from "./memberFixtures";
import StoryScreen from "./StoryScreen.astro";
import { ORG_PATH } from "./storyFixtures";

export default {
  title: "Backoffice/Medlemsliste",
  component: StoryScreen,
};

interface ScreenProps {
  members: MemberOverview[];
  search?: string;
  membersPath: string;
  messagesPath?: string;
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
        messagesPath: `${ORG_PATH}/meldinger`,
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
