// Screen stories render inside the org chrome the app ships (StoryScreen wraps
// OrgScreen), so Storybook shows the screen exactly as it ships.
import MemberDetailScreen from "./MemberDetailScreen.astro";
import {
  continuing,
  fixturePeriod,
  lapsed,
  nothingPaidYet,
  noWayToReach,
  withoutName,
} from "./memberFixtures";
import StoryScreen from "./StoryScreen.astro";
import { ORG_PATH } from "./storyFixtures";

export default {
  title: "Backoffice/Medlem",
  component: StoryScreen,
};

const membersPath = `${ORG_PATH}/medlemmer`;

const inFrame = (memberId: string, props: Record<string, unknown>) => ({
  active: "medlemmer",
  warnings: [],
  slots: {
    default: {
      component: MemberDetailScreen,
      props: {
        membersPath,
        memberPath: `${membersPath}/${memberId}`,
        ...props,
      },
    },
  },
});

/** What is recorded, presented — correcting it is a separate, asked-for action. */
export const Continuing = {
  args: inFrame("m-1", {
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@eksempel.example", phone: "4711111111" },
  }),
};

/** The edit action, opened. */
export const Editing = {
  args: inFrame("m-1", {
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@eksempel.example", phone: "4711111111" },
    editing: true,
  }),
};

/** Someone who supported for two years and has not renewed. */
export const LapsedWithHistory = {
  args: inFrame("m-3", {
    entry: {
      ...lapsed,
      history: [fixturePeriod("m-3", 2024, 250), fixturePeriod("m-3", 2023, 145, "Støttemedlem")],
    },
    values: { name: "Marit Fjeld", email: "marit@eksempel.example", phone: "" },
  }),
};

export const JustSaved = {
  args: inFrame("m-1", {
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@eksempel.example", phone: "4711111111" },
    saved: true,
  }),
};

export const WithErrors = {
  args: inFrame("m-1", {
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@", phone: "12" },
    editing: true,
    fieldErrors: {
      email: "Oppgi en gyldig e-postadresse, eller la feltet stå tomt.",
      phone: "Oppgi et gyldig telefonnummer, eller la feltet stå tomt.",
    },
  }),
};

/** A supporter who consented to a contact address but no name. */
export const WithoutName = {
  args: inFrame("m-4", {
    entry: { ...withoutName, history: [fixturePeriod("m-4", 2026, 125)] },
    values: { name: "", email: "ukjent@eksempel.example", phone: "" },
  }),
};

/** Paying, but with no address — the organization has to reach them itself. */
export const NoWayToReach = {
  args: inFrame("m-6", {
    entry: { ...noWayToReach, history: [fixturePeriod("m-6", 2026, 300)] },
    values: { name: "Sigrun Vik", email: "", phone: "4755555555" },
  }),
};

/** Approved, but the first payment has not landed — nothing to show yet. */
export const NothingPaidYet = {
  args: inFrame("m-5", {
    entry: { ...nothingPaidYet, history: [] },
    values: { name: "Nyinnmeldt Person", email: "", phone: "4744444444" },
  }),
};
