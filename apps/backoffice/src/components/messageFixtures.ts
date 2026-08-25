// Fictitious organization messages for the compose/result stories — never a
// real organization's words or a real person's details.
import type { MessageReach, OrgMessage } from "@stottemedlem/db";
import type { MessageDeliveryReport } from "../lib/messages";

const ORG_ID = "org-1";

/** The live-register counts the audience picker quotes. */
export const reach: { active: MessageReach; all: MessageReach } = {
  active: { reached: 34, unreachable: 3, declined: 1 },
  all: { reached: 41, unreachable: 5, declined: 2 },
};

export const draftValues = {
  subject: "Takk for støtten i år!",
  body:
    "Kjære støttemedlem,\n\n" +
    "tusen takk for at du støtter korpset i år. Kontingenten har gått til nye noter og " +
    "reparasjon av instrumenter, og i høst stiller vi med full besetning på distriktsstevnet.\n\n" +
    "Hilsen styret i Eksempel Skolekorps",
  audience: "active" as const,
};

export function fixtureMessage(overrides: Partial<OrgMessage> = {}): OrgMessage {
  return {
    id: "msg-1",
    orgId: ORG_ID,
    subject: draftValues.subject,
    body: draftValues.body,
    audience: "active",
    createdAt: "2026-08-25 09:00:00",
    sentAt: "2026-08-25 09:00:04",
    ...overrides,
  };
}

export const sentReport: MessageDeliveryReport = { sent: 34, failed: 1, unreachable: 3 };

export const sentProblems: { name: string | null; outcome: "failed" | "unreachable" }[] = [
  { name: "Sigrun Vik", outcome: "unreachable" },
  { name: "Nyinnmeldt Person", outcome: "unreachable" },
  { name: null, outcome: "unreachable" },
  { name: "Bjørn Aas", outcome: "failed" },
];
