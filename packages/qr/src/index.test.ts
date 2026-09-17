import { describe, expect, it } from "vitest";
import {
  CARD,
  DEEP,
  EDGE,
  FAINT,
  FONT,
  HAIRLINE,
  HEART,
  INK,
  MUTED,
  qrModulesPath,
} from "./brand.js";
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, qrCardSvg, qrSvg } from "./index.js";

const JOIN_URL = "https://stottemedlem.no/bli-medlem/bakvendtland-skolekorps";

describe("qrSvg", () => {
  it("produces a standalone SVG document", async () => {
    const svg = await qrSvg(JOIN_URL);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("carries the same heart the cards do, so an organization hands out one code", async () => {
    const svg = await qrSvg(JOIN_URL);
    expect(svg).toContain(`fill="${HEART}"`);
    expect(svg).not.toContain("❤");
  });
});

describe("the heart in the middle of a code", () => {
  it("leaves the modules under it undrawn, so the card's own white backs it", () => {
    const whole = qrModulesPath(JOIN_URL);
    const hearted = qrModulesPath(JOIN_URL, { heart: true });
    expect(whole.hole).toBeNull();
    expect(hearted.hole).not.toBeNull();
    // Same code, fewer modules drawn: the hole is an omission, not an overlay.
    expect(hearted.moduleCount).toBe(whole.moduleCount);
    expect(hearted.path.length).toBeLessThan(whole.path.length);
  });

  it("covers well under the share of the code that error correction can rebuild", () => {
    // Measured breaking points at level M are 32% of the width for a join
    // address and 28% for a member's scan address; anything approaching those
    // is a code that decodes here and fails on a printed card under a phone
    // camera. See budget.mjs in the verify-qr skill.
    for (const url of [JOIN_URL, "HTTPS://XN--STTTEMEDLEM-HGB.NO/V/8P2K4RTZQ9VWXB6MN3HJD5CFG7"]) {
      const qr = qrModulesPath(url, { heart: true });
      expect(qr.hole).not.toBeNull();
      const share = (qr.hole?.size ?? 0) / qr.moduleCount;
      expect(share).toBeLessThan(0.2);
    }
  });

  it("centres the hole on a module rather than straddling two", () => {
    const qr = qrModulesPath(JOIN_URL, { heart: true });
    expect((qr.hole?.size ?? 0) % 2).toBe(1);
    expect(Number.isInteger(qr.hole?.from)).toBe(true);
  });

  it("keeps the heart clear of the quiet zone and the finder patterns", () => {
    const qr = qrModulesPath(JOIN_URL, { heart: true });
    const hole = qr.hole;
    if (hole === null) throw new Error("expected a hole");
    // The finders occupy 8 modules in each corner, and the timing lines run
    // along row and column 6. The hole starts well past all of them.
    expect(hole.from).toBeGreaterThan(8);
    expect(hole.from + hole.size).toBeLessThan(qr.moduleCount - 8);
  });
});

describe("qrCardSvg", () => {
  it("renders a card with the organization name and QR modules", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Bakvendtland Skolekorps" });
    expect(svg).toContain("<svg");
    expect(svg).toContain(`viewBox="0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}"`);
    expect(svg).toContain("Bakvendtland Skolekorps");
    expect(svg).toContain("BLI STØTTEMEDLEM");
    expect(svg).toContain("Vipps");
    expect(svg).toContain('<path d="M');
  });

  it("carries the støttemedlem.no attribution by default", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Korpset" });
    expect(svg).toContain("støttemedlem.no");
  });

  it("draws its heart instead of typing it", () => {
    // The card is rasterized and printed with no colour-emoji font anywhere in
    // reach, so a "❤️" would come out as an empty box
    // (specs/concepts/brand-mark.md).
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Korpset" });
    expect(svg).not.toContain("❤");
    expect(svg).toContain(`fill="${HEART}"`);
  });

  it("carries no colour but the heart", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Korpset" });
    const colours = new Set([...svg.matchAll(/#[0-9a-f]{6}/g)].map((match) => match[0]));
    colours.delete(HEART);
    // Everything else on the card is the product's warm ink or its paper
    // (specs/concepts/brand-palette.md): no green, no orange, nothing.
    expect([...colours].sort()).toEqual([CARD, EDGE, HAIRLINE, INK, DEEP, MUTED, FAINT].sort());
  });

  it("is set in the same Fraunces as the rest of the product", () => {
    const svg = qrCardSvg({ joinUrl: JOIN_URL, organizationName: "Korpset" });
    expect(svg).not.toContain("system-ui");
    for (const font of [...svg.matchAll(/font-family="([^"]*)"/g)].map((match) => match[1])) {
      expect(font).toEqual(FONT);
    }
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
