import MemberDetailScreen from "./MemberDetailScreen.astro";
import { continuing, fixturePeriod, lapsed, nothingPaidYet } from "./memberFixtures";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Medlem",
  component: ScreenFrame,
};

const inFrame = (props: Record<string, unknown>) => ({
  slots: {
    default: {
      component: MemberDetailScreen,
      props: { membersPath: "#", ...props },
    },
  },
});

export const Continuing = {
  args: inFrame({
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@eksempel.example", phone: "4711111111" },
  }),
};

/** Someone who supported for two years and has not renewed. */
export const LapsedWithHistory = {
  args: inFrame({
    entry: {
      ...lapsed,
      history: [fixturePeriod("m-3", 2024, 250), fixturePeriod("m-3", 2023, 145, "Støttemedlem")],
    },
    values: { name: "Marit Fjeld", email: "marit@eksempel.example", phone: "" },
  }),
};

export const JustSaved = {
  args: inFrame({
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@eksempel.example", phone: "4711111111" },
    saved: true,
  }),
};

export const WithErrors = {
  args: inFrame({
    entry: { ...continuing, history: [fixturePeriod("m-1", 2026, 300)] },
    values: { name: "Ingrid Solheim", email: "ingrid@", phone: "12" },
    fieldErrors: {
      email: "Oppgi en gyldig e-postadresse, eller la feltet stå tomt.",
      phone: "Oppgi et gyldig telefonnummer, eller la feltet stå tomt.",
    },
  }),
};

/** Approved, but the first payment has not landed — nothing to show yet. */
export const NothingPaidYet = {
  args: inFrame({
    entry: { ...nothingPaidYet, history: [] },
    values: { name: "Nyinnmeldt Person", email: "", phone: "4744444444" },
  }),
};
