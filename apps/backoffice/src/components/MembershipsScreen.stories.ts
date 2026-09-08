import type { OrgWarning } from "../lib/orgWarnings";
import MembershipsScreen from "./MembershipsScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import { ALL_WARNINGS, BASIC_TIER, ORG_PATH, TIERS } from "./storyFixtures";

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
      props: { orgPath: ORG_PATH, tiers: TIERS, warnings, ...props },
    },
  },
});

/** The offer, as the same cards the public join page shows. */
export const Default = { args: memberships() };

/** Landing here from the form: the save is confirmed in words as well. */
export const JustSaved = { args: memberships({ savedName: BASIC_TIER.name }) };

/** After an archive: the card is gone, and the list says so. */
export const JustArchived = { args: memberships({ archivedName: "Sølv" }) };

/**
 * Before the first membership exists there is nothing to show supporters — the
 * tab's badge is spelled out here, with the action that fixes it.
 */
export const NoMembershipsYet = {
  args: memberships(
    { tiers: [] },
    ALL_WARNINGS.filter((w) => w.tab === "medlemskap"),
  ),
};
