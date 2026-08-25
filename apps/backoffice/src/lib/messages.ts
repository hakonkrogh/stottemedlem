import { memberUnsubscribePath } from "@stottemedlem/core";
import {
  type Db,
  getOrgMessage,
  inMessageAudience,
  isMessageReachable,
  listMessageableMembers,
  listOrgMessageRecipients,
  type MessageableMember,
  markOrgMessageSent,
  type Organization,
  type OrgMessageRecipient,
  recordOrgMessageRecipient,
} from "@stottemedlem/db";
import { type EmailMessage, type EmailSender, orgMessage } from "@stottemedlem/email";

// Delivering an organization's own message to its supporting members
// (specs/concepts/org-message.md, specs/use-cases/keep-supporters-in-the-loop.md).
//
// The audience is derived from the live register HERE, at delivery time —
// what the administrator chose is a rule ("current members" or "also lapsed"),
// never a stored list. Like the notice job, this works by comparison: every
// member dealt with has a recorded outcome, so a retried run skips them and a
// crash mid-way costs nothing but a delay.

/**
 * What the send job puts on the queue. Sending to everyone is bigger than any
 * single request wants to be, so the request only writes the message down and
 * the queue consumer (src/worker.ts) does the walking.
 */
export interface OrgMessageJob {
  type: "org-message";
  /** The org's stable slug — enough to find it again in the consumer. */
  slug: string;
  messageId: string;
  /** The origin the unsubscribe links should live on. */
  origin: string;
}

export function isOrgMessageJob(body: unknown): body is OrgMessageJob {
  if (typeof body !== "object" || body === null) return false;
  const job = body as Record<string, unknown>;
  return (
    job.type === "org-message" &&
    typeof job.slug === "string" &&
    typeof job.messageId === "string" &&
    typeof job.origin === "string"
  );
}

/** What became of a message, counted from its recorded recipients. */
export interface MessageDeliveryReport {
  sent: number;
  failed: number;
  unreachable: number;
}

export function summarizeDelivery(recipients: OrgMessageRecipient[]): MessageDeliveryReport {
  const report: MessageDeliveryReport = { sent: 0, failed: 0, unreachable: 0 };
  for (const recipient of recipients) report[recipient.outcome]++;
  return report;
}

/**
 * Send one recorded message to its audience and write down, per member, what
 * actually happened. Idempotent: members already dealt with are skipped, a
 * message already marked sent is not walked again, so the queue may safely
 * redeliver after a crash. Only the provider's word makes a member count as
 * reached — the product never claims a send that did not happen.
 */
export async function deliverOrgMessage(
  db: Db,
  org: Organization,
  messageId: string,
  origin: string,
  sender: EmailSender,
): Promise<MessageDeliveryReport | null> {
  const message = await getOrgMessage(db, org.id, messageId);
  if (!message) return null;
  if (message.sentAt) return summarizeDelivery(await listOrgMessageRecipients(db, messageId));

  const everyone = await listMessageableMembers(db, org.id);
  const dealtWith = new Set(
    (await listOrgMessageRecipients(db, messageId)).map((row) => row.memberId),
  );
  // Members who declined are simply not in the audience — no row, no message,
  // whatever the administrator chose.
  const audience = everyone.filter(
    (entry) =>
      inMessageAudience(entry, message.audience) &&
      !entry.member.messagesDeclinedAt &&
      !dealtWith.has(entry.member.id),
  );

  const emails: EmailMessage[] = [];
  const recipients: MessageableMember[] = [];
  for (const entry of audience) {
    if (!isMessageReachable(entry) || !entry.member.email || !entry.manageToken) {
      await recordOrgMessageRecipient(db, {
        messageId,
        orgId: org.id,
        memberId: entry.member.id,
        outcome: "unreachable",
      });
      continue;
    }
    emails.push(
      orgMessage({
        orgName: org.name,
        orgContactEmail: org.contactEmail,
        memberEmail: entry.member.email,
        subject: message.subject,
        body: message.body,
        unsubscribeUrl: `${origin}${memberUnsubscribePath(org.slug, entry.manageToken)}`,
      }),
    );
    recipients.push(entry);
  }

  const results = emails.length > 0 ? await sender.send(emails) : [];
  for (const [index, entry] of recipients.entries()) {
    const result = results[index];
    await recordOrgMessageRecipient(db, {
      messageId,
      orgId: org.id,
      memberId: entry.member.id,
      outcome: result?.sent ? "sent" : "failed",
      detail: result?.detail,
    });
  }

  await markOrgMessageSent(db, messageId);
  return summarizeDelivery(await listOrgMessageRecipients(db, messageId));
}
