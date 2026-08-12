import { describe, expect, it } from "vitest";
import {
  contentSha256,
  signWebhookDelivery,
  verifyWebhookDelivery,
  type WebhookDelivery,
} from "./webhook-verification.js";

// The worked example from the official request-authentication docs page.
const DOCS_BODY = '{"some-unique-content":"ee6e441b-cc4a-46f8-895d-a5af79bcc233/hello-world"}';
const DOCS_BODY_SHA256 = "lNlsp1XA03N34HrQsVzPgJKtC+r7l/RBF4V3JQUWMj4=";

const SECRET = "090a479d-ba8b-4f43-a7a5-4b8e9d0a2f6e";

async function signedDelivery(overrides: Partial<WebhookDelivery> = {}): Promise<WebhookDelivery> {
  const base = {
    method: "POST",
    pathAndQuery: "/webhooks/vipps",
    host: "staging.app.xn--stttemedlem-hgb.no",
    date: "Thu, 30 Mar 2023 08:38:32 GMT",
    body: DOCS_BODY,
    ...overrides,
  };
  const signed = await signWebhookDelivery(base, SECRET);
  return { ...base, ...signed, ...overrides };
}

describe("contentSha256", () => {
  it("reproduces the hash from the official docs example", async () => {
    expect(await contentSha256(DOCS_BODY)).toBe(DOCS_BODY_SHA256);
  });
});

describe("verifyWebhookDelivery", () => {
  it("accepts a correctly signed delivery", async () => {
    expect(await verifyWebhookDelivery(await signedDelivery(), SECRET)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const delivery = await signedDelivery();
    delivery.body = '{"some-unique-content":"tampered"}';
    expect(await verifyWebhookDelivery(delivery, SECRET)).toBe(false);
  });

  it("rejects a body re-hashed to match a tampered payload", async () => {
    const delivery = await signedDelivery();
    delivery.body = '{"some-unique-content":"tampered"}';
    delivery.contentSha256 = await contentSha256(delivery.body);
    expect(await verifyWebhookDelivery(delivery, SECRET)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    expect(await verifyWebhookDelivery(await signedDelivery(), "not-the-secret")).toBe(false);
  });

  it("rejects a delivery replayed against another host", async () => {
    const delivery = await signedDelivery();
    delivery.host = "evil.example.com";
    expect(await verifyWebhookDelivery(delivery, SECRET)).toBe(false);
  });

  it("rejects malformed Authorization headers without throwing", async () => {
    for (const authorization of [
      "",
      "Bearer abc",
      "HMAC-SHA256 Signature=",
      "HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=%%%",
    ]) {
      const delivery = await signedDelivery();
      delivery.authorization = authorization;
      expect(await verifyWebhookDelivery(delivery, SECRET)).toBe(false);
    }
  });
});
