// Screen stories render inside the same chrome the app ships (StoryScreen wraps
// OrgScreen), and every link points at the story that shows where it leads — so
// the whole back office can be clicked through here, tabs included.
import type { OrgWarning } from "../lib/orgWarnings";
import OrgOverviewScreen from "./OrgOverviewScreen.astro";
import StoryScreen from "./StoryScreen.astro";
import {
  ACTIVE_MEMBERS,
  ALL_WARNINGS,
  JOIN_URL,
  NO_STATS,
  ORG,
  ORG_PATH,
  ORG_STATS,
  PERIOD_LABEL,
  QR_CARD_PREVIEW_SRC,
  QR_CARD_URL,
  TERMS_URL,
} from "./storyFixtures";

export default {
  title: "Backoffice/Oversikt",
  component: StoryScreen,
};

const overview = (
  props: Record<string, unknown> = {},
  warnings: OrgWarning[] = [],
  activeMembers = ACTIVE_MEMBERS,
) => ({
  active: "oversikt",
  warnings,
  activeMembers,
  slots: {
    default: {
      component: OrgOverviewScreen,
      props: {
        orgPath: ORG_PATH,
        orgName: ORG.name,
        joinUrl: JOIN_URL,
        termsUrl: TERMS_URL,
        qrCardUrl: QR_CARD_URL,
        qrCardPreviewSrc: QR_CARD_PREVIEW_SRC,
        stats: ORG_STATS,
        periodLabel: PERIOD_LABEL,
        ...props,
      },
    },
  },
});

/** An organization in order: nothing to fix, just the addresses it shares. */
export const Default = { args: overview() };

/** Everything a half-finished organization still owes, each with its way in.
 *  Nobody has joined it, so it carries no figures at all. */
export const NeedsSetup = {
  args: overview({ warnings: ALL_WARNINGS, stats: NO_STATS }, ALL_WARNINGS, 0),
};

/** Set up and waiting for its first supporter: every figure is a nothing, and
 *  the front page is the same front page it will be once they arrive. */
export const NobodyHasJoinedYet = {
  args: overview({ stats: NO_STATS }, [], 0),
};

/** Straight after a price change: who was told, and who the org must tell. */
export const AfterPriceChange = {
  args: overview({ feeNotice: { told: 22, unreached: 2 } }),
};
