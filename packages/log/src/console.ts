import type { LogEvent, LogSink } from "./types.js";

/**
 * The baseline sink, present everywhere: Workers observability logs on the
 * backend, the devtools console in a browser, stdout in a script.
 */
export function consoleSink(): LogSink {
  return {
    log(event: LogEvent): void {
      const parts: unknown[] = [event.message];
      if (Object.keys(event.context).length > 0) parts.push(event.context);
      if (event.error !== undefined) parts.push(event.error);
      if (event.level === "error") console.error(...parts);
      else if (event.level === "warn") console.warn(...parts);
      else console.log(...parts);
    },
  };
}
