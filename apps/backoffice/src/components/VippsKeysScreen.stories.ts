import type { OrgWarning } from "../lib/orgWarnings";
import StoryScreen from "./StoryScreen.astro";
import { ORG, ORG_PATH, PAYMENT_EVENT_WARNING, STORED_KEYS, WEBHOOK_URL } from "./storyFixtures";
import VippsKeysScreen from "./VippsKeysScreen.astro";

export default {
  title: "Backoffice/Vipps",
  component: StoryScreen,
};

const empty = { clientId: "", clientSecret: "", subscriptionKey: "", merchantSerialNumber: "" };

const vipps = (props: Record<string, unknown> = {}, warnings: OrgWarning[] = []) => ({
  active: "innstillinger",
  warnings,
  slots: {
    default: {
      component: VippsKeysScreen,
      props: {
        orgName: ORG.name,
        orgPath: ORG_PATH,
        envLabel: "testmiljøet (apitest.vipps.no)",
        stored: STORED_KEYS,
        values: empty,
        expectedWebhookUrl: WEBHOOK_URL,
        ...props,
      },
    },
  },
});

/** Keys that work, and payment events that arrive: nothing to operate. */
export const StoredKeys = { args: vipps() };

/** Replacing the keys is a deliberate action, never four fields left open. */
export const ReplacingKeys = { args: vipps({ editing: true }) };

/** No keys yet — then the form is all there is. */
export const NoKeysYet = { args: vipps({ stored: null }, PAYMENT_EVENT_WARNING) };

/** Payment events are not connected: said out loud, with the retry. */
export const PaymentEventsMissing = {
  args: vipps(
    { stored: { ...STORED_KEYS, webhookUrl: null, webhookRegisteredDate: null } },
    PAYMENT_EVENT_WARNING,
  ),
};

/** The registration points somewhere else — the same retry puts it right. */
export const PaymentEventsElsewhere = {
  args: vipps(
    {
      stored: {
        ...STORED_KEYS,
        webhookUrl: "https://staging.example/api/vipps/vestbygda-musikkorps",
      },
    },
    PAYMENT_EVENT_WARNING,
  ),
};

/** Vipps refused the pasted keys, so nothing was stored. */
export const RejectedByVipps = {
  args: vipps({
    editing: true,
    values: { ...empty, clientId: "feil-id", merchantSerialNumber: "123456" },
    validationError:
      "Vipps avviste nøklene. Sjekk at alle fire verdiene er kopiert riktig fra portalen, og at de hører til testmiljøet (apitest.vipps.no).",
  }),
};
