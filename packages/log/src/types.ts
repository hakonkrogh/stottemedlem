/**
 * One logging surface for the whole product, on every runtime it has — the
 * Worker, scripts, and the browser. Code logs against `Logger`; where those
 * events go is decided by the sinks the app wires in (console always, an
 * alerting vendor when configured — Sentry today, others can be added without
 * touching a call site). Spec: specs/concepts/operational-alerting.md.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Levels in ascending severity, for sinks that filter by threshold. */
export const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

export function levelAtLeast(level: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(threshold);
}

export interface LogEvent {
  level: LogLevel;
  message: string;
  /** The thrown value, when the event reports one. */
  error?: unknown;
  /**
   * Structured details — identifiers, counts. Never a member's name, email or
   * phone number: events leave the building through vendor sinks.
   */
  context: Record<string, unknown>;
}

/**
 * Where events go. A sink must not throw — a broken alerting vendor must never
 * become the outage it exists to report — but the logger guards anyway.
 */
export interface LogSink {
  log(event: LogEvent): void;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  /** `error` carries the thrown value so sinks can keep its stack trace. */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  /** A child logger whose events all carry `context` (e.g. the org slug). */
  with(context: Record<string, unknown>): Logger;
}
