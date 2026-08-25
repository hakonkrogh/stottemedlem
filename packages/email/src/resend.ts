import type { EmailMessage, EmailResult, EmailSender } from "./types.js";

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";

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
        body: JSON.stringify(
          messages.map((message) => ({
            from: addressWithName(message.fromName, config.from),
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          })),
        ),
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
      const results: EmailResult[] = [];
      for (const batch of chunk(messages, RESEND_BATCH_LIMIT)) {
        results.push(...(await sendBatch(batch)));
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
