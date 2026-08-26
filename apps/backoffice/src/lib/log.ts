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
 * Console always — that is the Workers observability log. When a SENTRY_DSN
 * is configured (production), warn/error additionally become Sentry events,
 * which reach the operator by email; info/debug ride along as breadcrumbs on
 * the next alert. The Sentry SDK itself is initialized by the `withSentry`
 * wrapper in src/worker.ts — without it (or without a DSN) these captures are
 * silent no-ops, so local dev and staging just log.
 */
export const logger = createLoggerFactory(
  env.SENTRY_DSN ? [consoleSink(), sentrySink(Sentry)] : [consoleSink()],
);
