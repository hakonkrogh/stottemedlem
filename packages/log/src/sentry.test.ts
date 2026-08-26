import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.js";
import { type SentryLike, sentrySink } from "./sentry.js";

function fakeSentry(): SentryLike & {
  captureException: ReturnType<typeof vi.fn>;
  captureMessage: ReturnType<typeof vi.fn>;
  addBreadcrumb: ReturnType<typeof vi.fn>;
} {
  return {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
}

describe("sentrySink", () => {
  it("sends an error with its thrown value as an exception, message as extra", () => {
    const sentry = fakeSentry();
    const boom = new Error("boom");
    createLogger([sentrySink(sentry)]).error("renewals failed", boom, { org: "korpset" });
    expect(sentry.captureException).toHaveBeenCalledWith(boom, {
      level: "error",
      extra: { org: "korpset", message: "renewals failed" },
    });
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("sends an error without a thrown value as a message", () => {
    const sentry = fakeSentry();
    createLogger([sentrySink(sentry)]).error("renewals: 3 failed", undefined, { failed: 3 });
    expect(sentry.captureMessage).toHaveBeenCalledWith("renewals: 3 failed", {
      level: "error",
      extra: { failed: 3 },
    });
  });

  it('maps warn to Sentry\'s "warning"', () => {
    const sentry = fakeSentry();
    createLogger([sentrySink(sentry)]).warn("PUBLIC_ORIGIN not set");
    expect(sentry.captureMessage).toHaveBeenCalledWith("PUBLIC_ORIGIN not set", {
      level: "warning",
      extra: {},
    });
  });

  it("turns levels below the threshold into breadcrumbs, not events", () => {
    const sentry = fakeSentry();
    createLogger([sentrySink(sentry)]).info("repriced 2", { org: "korpset" });
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: "log",
      message: "repriced 2",
      level: "info",
      data: { org: "korpset" },
    });
  });

  it("respects a custom minLevel", () => {
    const sentry = fakeSentry();
    createLogger([sentrySink(sentry, { minLevel: "error" })]).warn("only a breadcrumb");
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(sentry.addBreadcrumb).toHaveBeenCalled();
  });

  it("tolerates an SDK without addBreadcrumb", () => {
    const sentry = { captureException: vi.fn(), captureMessage: vi.fn() };
    expect(() => createLogger([sentrySink(sentry)]).debug("fine")).not.toThrow();
  });
});
