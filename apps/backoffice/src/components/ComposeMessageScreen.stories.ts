// Screen stories render inside ScreenFrame (the same frame Shell uses) via a
// configured-component slot, so Storybook shows the screen as it ships.
import type { MessageReach, OrgMessage, OrgMessageAudience } from "@stottemedlem/db";
import ComposeMessageScreen from "./ComposeMessageScreen.astro";
import { draftValues, fixtureMessage, reach } from "./messageFixtures";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Meldinger",
  component: ScreenFrame,
};

interface ScreenProps {
  orgName: string;
  values: { subject: string; body: string; audience: OrgMessageAudience };
  fieldErrors: { subject?: string; body?: string };
  reach: { active: MessageReach; all: MessageReach };
  mode: "edit" | "preview";
  previous: OrgMessage[];
  messagesPath: string;
  backPath: string;
  error?: string | null;
}

const inFrame = (props: Partial<ScreenProps>) => ({
  slots: {
    default: {
      component: ComposeMessageScreen,
      props: {
        orgName: "Eksempel Skolekorps",
        values: { subject: "", body: "", audience: "active" },
        fieldErrors: {},
        reach,
        mode: "edit",
        previous: [],
        messagesPath: "#",
        backPath: "#",
        ...props,
      },
    },
  },
});

export const Default = { args: inFrame({}) };

/** The audience choice quotes the live register, caveats included. */
export const Filled = { args: inFrame({ values: draftValues }) };

/** The message exactly as a member will read it, footer and all. */
export const Preview = { args: inFrame({ values: draftValues, mode: "preview" }) };

/** Nothing goes out half-written. */
export const WithErrors = {
  args: inFrame({
    values: { subject: "", body: "", audience: "active" },
    fieldErrors: { subject: "Skriv et emne.", body: "Skriv en melding." },
  }),
};

/** Earlier messages stay findable, each linking to its own result. */
export const WithHistory = {
  args: inFrame({
    previous: [
      fixtureMessage(),
      fixtureMessage({ id: "msg-2", subject: "Sommerkonserten er i boks", sentAt: null }),
    ],
  }),
};
