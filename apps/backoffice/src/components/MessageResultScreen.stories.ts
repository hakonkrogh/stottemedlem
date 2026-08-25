// Screen stories render inside ScreenFrame (the same frame Shell uses) via a
// configured-component slot, so Storybook shows the screen as it ships.
import type { OrgMessage, OrgMessageOutcome } from "@stottemedlem/db";
import type { MessageDeliveryReport } from "../lib/messages";
import MessageResultScreen from "./MessageResultScreen.astro";
import { fixtureMessage, sentProblems, sentReport } from "./messageFixtures";
import ScreenFrame from "./ScreenFrame.astro";

export default {
  title: "Backoffice/Meldingsresultat",
  component: ScreenFrame,
};

interface ScreenProps {
  message: OrgMessage;
  report: MessageDeliveryReport;
  problems: { name: string | null; outcome: OrgMessageOutcome }[];
  messagesPath: string;
}

const inFrame = (props: Partial<ScreenProps>) => ({
  slots: {
    default: {
      component: MessageResultScreen,
      props: {
        message: fixtureMessage(),
        report: sentReport,
        problems: sentProblems,
        messagesPath: "#",
        ...props,
      },
    },
  },
});

/** What went out and what did not, plainly. */
export const Default = { args: inFrame({}) };

/** Everyone reached — nothing to chase. */
export const AllReached = {
  args: inFrame({ report: { sent: 34, failed: 0, unreachable: 0 }, problems: [] }),
};

/** The queue has the message but has not finished walking the audience yet. */
export const StillSending = {
  args: inFrame({
    message: fixtureMessage({ sentAt: null }),
    report: { sent: 0, failed: 0, unreachable: 0 },
    problems: [],
  }),
};
