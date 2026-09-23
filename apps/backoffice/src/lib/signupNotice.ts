import { env } from "cloudflare:workers";
import type { Organization } from "@stottemedlem/db";
import { orgSignupNotice } from "@stottemedlem/email";
import { getEmailSender } from "./email";
import { shareableJoinUrl } from "./joinLinks";
import { logger } from "./log";

const log = logger("organizations");

// A secret, like the Sentry DSN, and for the same reason: local dev inherits
// every wrangler.jsonc var, and a developer's test organizations must never
// mail the product's own people. Set on production only.
const secrets = env as typeof env & { SIGNUP_NOTICE_EMAIL?: string };

/**
 * Tells the product's own people that an organization has signed itself up
 * (specs/use-cases/sign-up-for-early-access.md). Production only, by
 * construction: without SIGNUP_NOTICE_EMAIL there is nobody to tell, and the
 * sign-up's log line is the whole record.
 *
 * Never throws. The organization exists already; a notice that fails must not
 * turn a finished sign-up into an error page, so a failure is reported
 * instead (specs/concepts/operational-alerting.md).
 */
export async function notifyOrgSignup(org: Organization): Promise<void> {
  const to = secrets.SIGNUP_NOTICE_EMAIL;
  if (!to) return;
  try {
    const [result] = await getEmailSender().send([
      orgSignupNotice({
        to,
        orgName: org.name,
        orgnr: org.orgnr ?? "",
        slug: org.slug,
        joinUrl: shareableJoinUrl(org.slug),
      }),
    ]);
    if (!result?.sent) {
      log.warn("could not send the sign-up notice", { orgId: org.id, detail: result?.detail });
    }
  } catch (error) {
    log.error("could not send the sign-up notice", error, { orgId: org.id });
  }
}
