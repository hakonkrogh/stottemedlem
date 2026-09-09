import type { OrgWarning } from "../lib/orgWarnings";
import StoryScreen from "./StoryScreen.astro";
import { JOIN_URL, ORG, ORG_PATH, PAYMENT_EVENT_WARNING, TERMS_URL } from "./storyFixtures";
import VippsGuideScreen from "./VippsGuideScreen.astro";

export default {
  title: "Backoffice/Vipps",
  component: StoryScreen,
};

const guide = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => ({
  active: "innstillinger",
  warnings,
  slots: {
    default: {
      component: VippsGuideScreen,
      props: {
        orgName: ORG.name,
        orgPath: ORG_PATH,
        joinUrl: JOIN_URL,
        termsUrl: TERMS_URL,
        keysStored: false,
        ...props,
      },
    },
  },
});

/** The errand ahead of an organization that has not connected Vipps yet. */
export const Guide = { args: guide({}, PAYMENT_EVENT_WARNING) };

/** Already connected: the same guide, now something to look things up in. */
export const GuideWithKeysStored = { args: guide({ keysStored: true }) };
