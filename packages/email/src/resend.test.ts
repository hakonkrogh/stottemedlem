import { describe, expect, it, vi } from "vitest";
import { createLoggingSender, createResendSender } from "./resend.js";
import type { EmailMessage } from "./types.js";

const message = (to: string): EmailMessage => ({
  to,
  fromName: "Fjellbygda Musikklag",
  replyTo: "post@fjellbygda-eksempel.no",
  subject: "Prisen endres",
  text: "Hei",
  html: "<p>Hei</p>",
});

const okResponse = (ids: string[]) =>
  new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), { status: 200 });

describe("createResendSender", () => {
  it("sends the display name but keeps our own verified address", async () => {
    const fetchMock = vi.fn(async () => okResponse(["id-1"]));
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    await sender.send([message("ingrid@eksempel.no")]);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body[0].from).toBe('"Fjellbygda Musikklag" <varsel@xn--stttemedlem-hgb.no>');
    expect(body[0].reply_to).toBe("post@fjellbygda-eksempel.no");
    expect(body[0].to).toEqual(["ingrid@eksempel.no"]);
  });

  it("keeps the sending address ours however the organization is named", async () => {
    const fetchMock = vi.fn(async () => okResponse(["id-1", "id-2"]));
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    await sender.send([
      // Closing the quote is the only way out of a display name; angle
      // brackets inside one are ordinary text, so they stay as typed.
      { ...message("a@eksempel.no"), fromName: 'Ondt" <ondt@angriper.no> x' },
      { ...message("b@eksempel.no"), fromName: "To\r\nBcc: alle@angriper.no" },
    ]);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body[0].from).toBe('"Ondt  <ondt@angriper.no> x" <varsel@xn--stttemedlem-hgb.no>');
    expect(body[1].from).toBe('"To Bcc: alle@angriper.no" <varsel@xn--stttemedlem-hgb.no>');
    for (const sent of body) {
      expect(sent.from.endsWith("<varsel@xn--stttemedlem-hgb.no>")).toBe(true);
      expect(sent.from).not.toMatch(/[\r\n]/);
    }
  });

  it("splits past the provider's batch limit and keeps every recipient", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body)) as unknown[];
      return okResponse(sent.map((_, i) => `id-${i}`));
    });
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const results = await sender.send(
      Array.from({ length: 150 }, (_, i) => message(`m${i}@eksempel.no`)),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(150);
    expect(results.every((r) => r.sent)).toBe(true);
    expect(results[149]?.to).toBe("m149@eksempel.no");
  });

  it("reports a rejected batch as nobody told", async () => {
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const results = await sender.send([message("a@eksempel.no"), message("b@eksempel.no")]);

    expect(results.every((r) => !r.sent)).toBe(true);
    expect(results[0]?.detail).toContain("429");
  });

  it("reports a network failure rather than throwing mid-sweep", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("connection reset");
    });
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const results = await sender.send([message("a@eksempel.no")]);
    expect(results[0]).toEqual({ to: "a@eksempel.no", sent: false, detail: "connection reset" });
  });

  it("does not claim a message was sent when the provider answered short", async () => {
    const fetchMock = vi.fn(async () => okResponse(["id-1"]));
    const sender = createResendSender({
      apiKey: "re_test",
      from: "varsel@xn--stttemedlem-hgb.no",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const results = await sender.send([message("a@eksempel.no"), message("b@eksempel.no")]);
    expect(results[0]?.sent).toBe(true);
    expect(results[1]?.sent).toBe(false);
  });
});

describe("createLoggingSender", () => {
  it("reports nothing sent, so nothing is recorded as told", async () => {
    const lines: string[] = [];
    const results = await createLoggingSender((line) => lines.push(line)).send([
      message("a@eksempel.no"),
    ]);
    expect(results[0]?.sent).toBe(false);
    expect(lines[0]).toContain("a@eksempel.no");
  });
});
