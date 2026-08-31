import type { EmailMessage, EmailResult, EmailSender } from "./types.js";

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const RESEND_SEND_URL = "https://api.resend.com/emails";

/** Resend accepts at most 100 messages per batch request. */
export const RESEND_BATCH_LIMIT = 100;

export interface ResendConfig {
  apiKey: string;
  /**
   * The address every notice is sent from. It must be on a domain we have
   * verified with the provider, which is why it cannot be the organization's
   * own address — that is what `replyTo` is for.
   */
  from: string;
  fetch?: typeof fetch;
}

interface ResendBatchResponse {
  data?: { id?: string }[];
}

interface ResendSendResponse {
  id?: string;
}

/** RFC 5322 display name: quote it, and don't let a name break out of the quotes. */
function addressWithName(name: string, address: string): string {
  const safe = name
    .replace(/[\\"]/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();
  return safe ? `"${safe}" <${address}>` : address;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Sends member notices through Resend.
 *
 * Batched, because a fee change can mean telling a few hundred people at once
 * while an administrator waits for the page to save. A batch that fails counts
 * as every message in it failing — overstating what we sent would be the one
 * error that matters here, since the record decides what a member may be
 * charged (specs/concepts/member-notice.md).
 */
export function createResendSender(config: ResendConfig): EmailSender {
  const doFetch = config.fetch ?? fetch;

  /** The provider's shape for one message, minus the recipient list wrapper. */
  const payload = (message: EmailMessage) => ({
    from: addressWithName(message.fromName, config.from),
    to: [message.to],
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
  });

  /**
   * One message on its own. The batch endpoint refuses attachments, so a
   * message carrying a file — a receipt with the member's card — goes this way
   * instead. Slower per message, and only ever used by the few that need it.
   */
  async function sendOne(message: EmailMessage): Promise<EmailResult> {
    const failed = (detail: string) => ({ to: message.to, sent: false, detail });
    let response: Response;
    try {
      response = await doFetch(RESEND_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload(message),
          attachments: (message.attachments ?? []).map((attachment) => ({
            filename: attachment.filename,
            content: attachment.contentBase64,
            content_type: attachment.contentType,
          })),
        }),
      });
    } catch (error) {
      return failed(error instanceof Error ? error.message : "network error");
    }
    if (!response.ok) return failed(`${response.status} ${(await response.text()).slice(0, 200)}`);
    const body = (await response.json()) as ResendSendResponse;
    return body.id ? { to: message.to, sent: true, detail: body.id } : failed("no id returned");
  }

  async function sendBatch(messages: EmailMessage[]): Promise<EmailResult[]> {
    const failed = (detail: string) => messages.map((m) => ({ to: m.to, sent: false, detail }));

    let response: Response;
    try {
      response = await doFetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages.map(payload)),
      });
    } catch (error) {
      return failed(error instanceof Error ? error.message : "network error");
    }

    if (!response.ok) {
      return failed(`${response.status} ${(await response.text()).slice(0, 200)}`);
    }

    const body = (await response.json()) as ResendBatchResponse;
    // Resend answers in the order it was asked, so position identifies the
    // recipient. A short answer means we cannot say those went out.
    return messages.map((message, index) => {
      const id = body.data?.[index]?.id;
      return id
        ? { to: message.to, sent: true, detail: id }
        : { to: message.to, sent: false, detail: "no id returned" };
    });
  }

  return {
    async send(messages) {
      // The caller reads results by position, so the order the caller gave
      // must survive the split between the two endpoints.
      const results: EmailResult[] = new Array(messages.length);
      const batchable: Array<{ index: number; message: EmailMessage }> = [];

      for (const [index, message] of messages.entries()) {
        if (message.attachments?.length) {
          results[index] = await sendOne(message);
        } else {
          batchable.push({ index, message });
        }
      }

      for (const batch of chunk(batchable, RESEND_BATCH_LIMIT)) {
        const sent = await sendBatch(batch.map((entry) => entry.message));
        for (const [position, entry] of batch.entries()) {
          const result = sent[position];
          if (result) results[entry.index] = result;
        }
      }
      return results;
    },
  };
}

/**
 * A sender for environments with no provider key — local development, and any
 * deploy where sending is not configured yet. It writes the notice to the log
 * and reports honestly that nothing was sent, so nothing is recorded as told.
 */
export function createLoggingSender(log: (message: string) => void = console.log): EmailSender {
  return {
    async send(messages) {
      for (const message of messages) {
        log(`[email:not-configured] to=${message.to} subject=${message.subject}\n${message.text}`);
      }
      return messages.map((m) => ({
        to: m.to,
        sent: false,
        detail: "no email provider configured",
      }));
    },
  };
}
