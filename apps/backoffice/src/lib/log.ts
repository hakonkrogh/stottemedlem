import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import { consoleSink, createLoggerFactory, sentrySink } from "@stottemedlem/log";

/**
 * The one way the backoffice speaks about itself
 * (specs/concepts/operational-alerting.md). Every module takes its own
 * area-stamped logger once, at module scope:
 *
 *   const log = logger("renewals");
 *
 * The slug becomes the `area` tag on Sentry issues and the `[area]` prefix in
 * the console; the shared package enforces that it is a real slug.
 *
 * Console always — that is the Workers observability log. When the SENTRY_DSN
 * secret is set (per deployed environment —
 * `wrangler secret put SENTRY_DSN [--env staging]`), warn/error additionally
 * become Sentry events, stamped with SENTRY_ENVIRONMENT so the operator can
 * filter production from staging; info/debug ride along as breadcrumbs on the
 * next alert. The Sentry SDK itself is initialized by the `withSentry`
 * wrapper in src/worker.ts — without it (or without a DSN) these captures are
 * silent no-ops. Because secrets never reach a local machine, local dev just
 * logs — a developer's traffic cannot end up in the operator's alerting.
 */
// Secrets are absent from the generated Env (stack-docs) — widen at the point
// of use.
const secrets = env as typeof env & { SENTRY_DSN?: string };
export const logger = createLoggerFactory(
  secrets.SENTRY_DSN ? [consoleSink(), sentrySink(Sentry)] : [consoleSink()],
);
