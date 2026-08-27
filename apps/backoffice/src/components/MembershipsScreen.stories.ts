import type { OrgWarning } from "../lib/orgWarnings";
import MembershipsScreen from "./MembershipsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import { ALL_WARNINGS, ORG_PATH, TIERS } from "./storyFixtures";

export default {
  title: "Backoffice/Medlemskap",
  component: StoryScreen,
};

const memberships = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => ({
  active: "medlemskap",
  warnings,
  slots: {
    default: {
      component: MembershipsScreen,
      props: { orgPath: ORG_PATH, tiers: TIERS, ...props },
    },
  },
});

/** The offer, as the same cards the public join page shows. */
export const Default = { args: memberships() };

/** Before the first membership exists there is nothing to show supporters. */
export const NoMembershipsYet = {
  args: memberships(
    { tiers: [] },
    ALL_WARNINGS.filter((w) => w.tab === "medlemskap"),
  ),
};
