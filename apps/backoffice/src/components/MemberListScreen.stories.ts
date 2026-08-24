// Screen stories render inside ScreenFrame (the same frame Shell uses) via a
// configured-component slot, so Storybook shows the screen as it ships.
import type { MemberOverview } from "@stottemedlem/db";
import MemberListScreen from "./MemberListScreen.astro";
import { everyone } from "./memberFixtures";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Medlemsliste",
  component: ScreenFrame,
};

interface ScreenProps {
  members: MemberOverview[];
  search?: string;
  membersPath: string;
  backPath: string;
  currentYear: number;
}

const inFrame = (props: Partial<ScreenProps>) => ({
  slots: {
    default: {
      component: MemberListScreen,
      props: {
        members: everyone,
        membersPath: "#",
        backPath: "#",
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
