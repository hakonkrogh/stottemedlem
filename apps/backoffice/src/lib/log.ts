import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import { consoleSink, createLogger, type Logger, sentrySink } from "@stottemedlem/log";

/**
 * The one logger the backoffice speaks through
 * (specs/concepts/operational-alerting.md). Console always — that is the
 * Workers observability log. When a SENTRY_DSN is configured (production),
 * warn/error additionally become Sentry events, which reach the operator by
 * email; info/debug ride along as breadcrumbs on the next alert. The Sentry
 * SDK itself is initialized by the `withSentry` wrapper in src/worker.ts —
 * without it (or without a DSN) these captures are silent no-ops, so local
 * dev and staging just log.
 */
let logger: Logger | undefined;

export function getLogger(): Logger {
  if (!logger) {
    const sinks = env.SENTRY_DSN ? [consoleSink(), sentrySink(Sentry)] : [consoleSink()];
    logger = createLogger(sinks);
  }
  return logger;
}
