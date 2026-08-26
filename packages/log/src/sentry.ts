import { type LogEvent, type LogLevel, type LogSink, levelAtLeast } from "./types.js";

/**
 * The slice of a Sentry SDK this sink needs, described structurally so the
 * package depends on no vendor: on the Worker the app passes
 * `import * as Sentry from "@sentry/cloudflare"`, in a browser
 * `import * as Sentry from "@sentry/browser"` — both satisfy this shape, and
 * so does a stub in tests.
 */
export interface SentryLike {
  captureException(error: unknown, captureContext?: unknown): unknown;
  captureMessage(message: string, captureContext?: unknown): unknown;
  addBreadcrumb?(breadcrumb: {
    category?: string;
    message?: string;
    level?: string;
    data?: Record<string, unknown>;
  }): unknown;
}

export interface SentrySinkOptions {
  /**
   * The lowest level that becomes a Sentry event (and so an alert email).
   * Everything below it is recorded as a breadcrumb instead — visible on the
   * next alert, never an alert itself. Default "warn": the operator hears
   * about what is wrong, not about a quiet night.
   */
  minLevel?: LogLevel;
}

/** Sentry spells the level "warning"; the rest match. */
function sentryLevel(level: LogLevel): string {
  return level === "warn" ? "warning" : level;
}

export function sentrySink(sentry: SentryLike, options: SentrySinkOptions = {}): LogSink {
  const minLevel = options.minLevel ?? "warn";
  return {
    log(event: LogEvent): void {
      if (!levelAtLeast(event.level, minLevel)) {
        sentry.addBreadcrumb?.({
          category: event.area,
          message: event.message,
          level: sentryLevel(event.level),
          data: event.context,
        });
        return;
      }
      // The area rides as a tag: tags are what Sentry's issue list filters
      // and alert rules match on, unlike extras.
      const captureContext = {
        level: sentryLevel(event.level),
        tags: { area: event.area },
        extra: event.context,
      };
      if (event.error !== undefined) {
        // The thrown value carries the stack trace Sentry groups by; the
        // message and context ride along as extras.
        sentry.captureException(event.error, {
          ...captureContext,
          extra: { ...event.context, message: event.message },
        });
      } else {
        sentry.captureMessage(event.message, captureContext);
      }
    },
  };
}
