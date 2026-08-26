import type { LogEvent, Logger, LogLevel, LogSink } from "./types.js";

/**
 * Fan every event out to every sink. Sinks are independent: one failing —
 * or one vendor being down — never stops the others, and never the caller.
 */
export function createLogger(
  sinks: readonly LogSink[],
  baseContext: Record<string, unknown> = {},
): Logger {
  function emit(
    level: LogLevel,
    message: string,
    error: unknown,
    context: Record<string, unknown> | undefined,
  ): void {
    const event: LogEvent = { level, message, context: { ...baseContext, ...context } };
    if (error !== undefined) event.error = error;
    for (const sink of sinks) {
      try {
        sink.log(event);
      } catch (sinkFailure) {
        // The one place a console call is allowed outside the console sink:
        // there is no safer channel left to report a broken sink through.
        console.error("log sink failed", sinkFailure);
      }
    }
  }

  return {
    debug: (message, context) => emit("debug", message, undefined, context),
    info: (message, context) => emit("info", message, undefined, context),
    warn: (message, context) => emit("warn", message, undefined, context),
    error: (message, error, context) => emit("error", message, error, context),
    with: (context) => createLogger(sinks, { ...baseContext, ...context }),
  };
}
