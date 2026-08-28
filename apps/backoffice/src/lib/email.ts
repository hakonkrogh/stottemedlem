import { env } from "cloudflare:workers";
import { createLoggingSender, createResendSender, type EmailSender } from "@stottemedlem/email";

/**
 * The provider key is a secret, so it exists at runtime but not in the `Env`
 * that `wrangler types` generates from wrangler.jsonc — a checkout without a
 * `.dev.vars` would not know the name. Naming the shape here keeps this module
 * type-checkable anywhere, including CI.
 */
const secrets = env as typeof env & { RESEND_API_KEY?: string };

/**
 * How member notices leave the building (specs/concepts/member-notice.md).
 *
 * The sending address is ours in every environment — a provider will only send
 * from a domain we have proved we own, so an organization's own address can
 * never be the sender. Notices go out from an unread noreply address; each
 * notice tells the member to take questions to the organization's own contact
 * address, which is also the reply address when the organization has one.
 *
 * With no key configured — local development, or a deploy where sending is not
 * set up yet — notices are written to the log and reported as unsent, so
 * nothing is recorded as having told anyone and the member stays on the price
 * they know.
 */
export function getEmailSender(): EmailSender {
  const apiKey = secrets.RESEND_API_KEY;
  if (!apiKey) return createLoggingSender();
  return createResendSender({ apiKey, from: env.EMAIL_FROM_ADDRESS });
}
