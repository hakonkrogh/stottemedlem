import { describe, expect, it } from "vitest";
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, qrCardSvg, qrSvg } from "./index.js";
import { qrPngBuffer } from "./node.js";

const JOIN_URL = "https://stottemedlem.no/bli-medlem/eksempel-musikkorps";

describe("qrSvg", () => {
  it("produces a standalone SVG document", async () => {
    const svg = await qrSvg(JOIN_URL);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });
});

describe("qrPngBuffer", () => {
  it("produces a PNG (magic bytes)", async () => {
    const png = await qrPngBuffer(JOIN_URL, { width: 256 });
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});

describe("qrCardSvg", () => {
  it("renders a card with the organization name and QR modules", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Eksempel Musikkorps" });
    expect(svg).toContain("<svg");
    expect(svg).toContain(`viewBox="0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}"`);
    expect(svg).toContain("Eksempel Musikkorps");
    expect(svg).toContain("BLI STØTTEMEDLEM");
    expect(svg).toContain("Vipps");
    expect(svg).toContain('<path d="M');
  });

  it("carries the støttemedlem.no attribution by default", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Korpset" });
    expect(svg).toContain("støttemedlem.no");
  });

  it("escapes markup in the organization name", () => {
    const svg = qrCardSvg({
      joinUrl: JOIN_URL,
      organizationName: `Ola & Kari's <Band> "AS"`,
    });
    expect(svg).not.toContain("<Band>");
    expect(svg).toContain("Ola &amp; Kari&apos;s &lt;Band&gt; &quot;AS&quot;");
  });

  it("is deterministic for the same input", () => {
    const options = { joinUrl: JOIN_URL, organizationName: "Korpset" };
    expect(qrCardSvg(options)).toEqual(qrCardSvg(options));
  });
});
