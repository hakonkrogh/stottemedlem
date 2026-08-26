import { env } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import {
  consoleSink,
  createLogger,
  type Logger,
  type LogSink,
  sentrySink,
} from "@stottemedlem/log";

/**
 * The one way the backoffice speaks about itself
 * (specs/concepts/operational-alerting.md). Every caller names its area —
 * `logger("renewals")` — so each event says where to look; the slug becomes
 * the `area` tag on Sentry issues and the `[area]` prefix in the console.
 *
 * Console always — that is the Workers observability log. When a SENTRY_DSN
 * is configured (production), warn/error additionally become Sentry events,
 * which reach the operator by email; info/debug ride along as breadcrumbs on
 * the next alert. The Sentry SDK itself is initialized by the `withSentry`
 * wrapper in src/worker.ts — without it (or without a DSN) these captures are
 * silent no-ops, so local dev and staging just log.
 */
const loggers = new Map<string, Logger>();
let sinks: LogSink[] | undefined;

export function logger(area: string): Logger {
  let log = loggers.get(area);
  if (!log) {
    sinks ??= env.SENTRY_DSN ? [consoleSink(), sentrySink(Sentry)] : [consoleSink()];
    log = createLogger(area, sinks);
    loggers.set(area, log);
  }
  return log;
}
