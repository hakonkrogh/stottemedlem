import type { LogEvent, Logger, LogLevel, LogSink } from "./types.js";

const AREA_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Every logger must name its area, and the name must be a real slug — this is
 * enforced here, in the shared package, so no wiring can quietly skip it.
 * Throwing (rather than normalizing) surfaces a bad area at module init,
 * where areas are literal strings and the mistake is one line away.
 */
function assertArea(area: string): void {
  if (!AREA_PATTERN.test(area)) {
    throw new Error(`invalid log area "${area}" — use a short lowercase slug like "renewals"`);
  }
}

/**
 * Fan every event out to every sink. Sinks are independent: one failing —
 * or one vendor being down — never stops the others, and never the caller.
 * The area slug is mandatory and fixed for the logger's lifetime — children
 * from `with()` inherit it.
 */
export function createLogger(
  area: string,
  sinks: readonly LogSink[],
  baseContext: Record<string, unknown> = {},
): Logger {
  assertArea(area);
  function emit(
    level: LogLevel,
    message: string,
    error: unknown,
    context: Record<string, unknown> | undefined,
  ): void {
    const event: LogEvent = { area, level, message, context: { ...baseContext, ...context } };
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
    with: (context) => createLogger(area, sinks, { ...baseContext, ...context }),
  };
}

/**
 * The app-facing entry point: bind the sinks once, then every module asks for
 * its own area — `const log = logger("renewals")` at module scope. One cached
 * logger per area, so repeated calls are free and context-free modules can
 * share an instance.
 */
export function createLoggerFactory(sinks: readonly LogSink[]): (area: string) => Logger {
  const loggers = new Map<string, Logger>();
  return (area) => {
    let log = loggers.get(area);
    if (!log) {
      log = createLogger(area, sinks);
      loggers.set(area, log);
    }
    return log;
  };
}
