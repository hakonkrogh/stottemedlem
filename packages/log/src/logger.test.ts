import { describe, expect, it, vi } from "vitest";
import { consoleSink } from "./console.js";
import { createLogger } from "./logger.js";
import type { LogEvent, LogSink } from "./types.js";

function collectingSink(): { sink: LogSink; events: LogEvent[] } {
  const events: LogEvent[] = [];
  return { sink: { log: (event) => events.push(event) }, events };
}

describe("createLogger", () => {
  it("fans one event out to every sink", () => {
    const a = collectingSink();
    const b = collectingSink();
    createLogger([a.sink, b.sink]).info("hello");
    expect(a.events).toHaveLength(1);
    expect(b.events).toHaveLength(1);
    expect(a.events[0]).toEqual({ level: "info", message: "hello", context: {} });
  });

  it("carries the thrown value on error events", () => {
    const { sink, events } = collectingSink();
    const boom = new Error("boom");
    createLogger([sink]).error("job failed", boom, { org: "korpset" });
    expect(events[0]).toEqual({
      level: "error",
      message: "job failed",
      error: boom,
      context: { org: "korpset" },
    });
  });

  it("merges bound context under call-site context", () => {
    const { sink, events } = collectingSink();
    const logger = createLogger([sink]).with({ org: "korpset", cron: "0 4 * * *" });
    logger.warn("slow", { org: "koret" });
    expect(events[0]?.context).toEqual({ org: "koret", cron: "0 4 * * *" });
  });

  it("a throwing sink stops neither the caller nor the other sinks", () => {
    const broken: LogSink = {
      log: () => {
        throw new Error("vendor down");
      },
    };
    const { sink, events } = collectingSink();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => createLogger([broken, sink]).error("still logged")).not.toThrow();
    expect(events).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledWith("log sink failed", expect.any(Error));
    consoleError.mockRestore();
  });
});

describe("consoleSink", () => {
  it("routes levels to the matching console method and omits empty context", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = createLogger([consoleSink()]);
    const boom = new Error("boom");
    logger.info("quiet night");
    logger.warn("degraded", { org: "korpset" });
    logger.error("failed", boom);
    expect(log).toHaveBeenCalledWith("quiet night");
    expect(warn).toHaveBeenCalledWith("degraded", { org: "korpset" });
    expect(error).toHaveBeenCalledWith("failed", boom);
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
