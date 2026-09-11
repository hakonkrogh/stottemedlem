import { describe, expect, it } from "vitest";
import { type AlertEvent, REDACTED_TAG, redactAlert } from "./redact.js";

const options = { secretQueryParams: ["n"] };

describe("redactAlert", () => {
  it("drops a captured request body and says so", () => {
    const event: AlertEvent = {
      request: {
        method: "POST",
        url: "https://app.example/o/bakvendtland-skolekorps/vipps",
        data: "clientId=abc&clientSecret=hemmelig&subscriptionKey=nokkel&msn=123456",
      } as AlertEvent["request"],
    };
    const out = redactAlert(event, options);
    expect(out.request).not.toHaveProperty("data");
    expect(out.tags).toEqual({ [REDACTED_TAG]: "body" });
    expect(JSON.stringify(out)).not.toContain("hemmelig");
  });

  it("blanks the manage token in the address but keeps the page", () => {
    const event: AlertEvent = {
      request: {
        url: "https://app.example/bli-medlem/bakvendtland-skolekorps/min-side?n=0f1e2d3c-token&x=1",
        query_string: "n=0f1e2d3c-token&x=1",
      },
    };
    const out = redactAlert(event, options);
    expect(out.request?.url).toBe(
      "https://app.example/bli-medlem/bakvendtland-skolekorps/min-side?n=[redacted]&x=1",
    );
    expect(out.request?.query_string).toBe("n=[redacted]&x=1");
    expect(out.tags).toEqual({ [REDACTED_TAG]: "token" });
  });

  it("blanks the token however the vendor shaped the query string", () => {
    const asObject = redactAlert({ request: { query_string: { n: "tok", x: "1" } } }, options);
    expect(asObject.request?.query_string).toEqual({ n: "[redacted]", x: "1" });

    const asPairs = redactAlert(
      {
        request: {
          query_string: [
            ["n", "tok"],
            ["x", "1"],
          ],
        },
      },
      options,
    );
    expect(asPairs.request?.query_string).toEqual([
      ["n", "[redacted]"],
      ["x", "1"],
    ]);
  });

  it("does not blank a parameter that merely ends with the secret's name", () => {
    const out = redactAlert(
      { request: { url: "https://app.example/x?verva=card-token&n=tok" } },
      options,
    );
    expect(out.request?.url).toBe("https://app.example/x?verva=card-token&n=[redacted]");
  });

  it("drops cookies and credential headers, keeps the rest", () => {
    const out = redactAlert(
      {
        request: {
          cookies: { "wos-session": "sealed" },
          headers: { Cookie: "wos-session=sealed", Authorization: "Bearer x", "User-Agent": "ua" },
        },
      },
      options,
    );
    expect(out.request).not.toHaveProperty("cookies");
    expect(out.request?.headers).toEqual({ "User-Agent": "ua" });
    expect(out.tags?.[REDACTED_TAG]).toBe("cookies,headers");
  });

  it("leaves a clean report untagged and an event without a request untouched", () => {
    const clean = redactAlert(
      { request: { url: "https://app.example/o/bakvendtland-skolekorps", query_string: "a=1" } },
      options,
    );
    expect(clean.tags).toBeUndefined();
    expect(clean.request?.url).toBe("https://app.example/o/bakvendtland-skolekorps");

    const noRequest = redactAlert({ tags: { area: "renewals" } }, options);
    expect(noRequest).toEqual({ tags: { area: "renewals" } });
  });

  it("keeps the tags the report already had", () => {
    const out = redactAlert({ request: { data: "x" }, tags: { area: "webhooks" } }, options);
    expect(out.tags).toEqual({ area: "webhooks", [REDACTED_TAG]: "body" });
  });
});
