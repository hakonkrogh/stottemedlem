import { describe, expect, it } from "vitest";
import {
  MEMBER_CARD_HEIGHT,
  MEMBER_CARD_TALL_HEIGHT,
  MEMBER_CARD_TALL_WIDTH,
  MEMBER_CARD_WIDTH,
  memberCardSize,
  memberCardSvg,
} from "./memberCard.js";

const base = {
  memberName: "Kari Nordmann",
  organizationName: "Eksempel Musikkorps",
  hearts: 3,
  periodText: "2026",
  joinUrl: "https://xn--stttemedlem-hgb.no/bli-medlem/eksempel?verva=kort-1",
};

/** Hearts are `<path>` elements, so counting them means counting the shapes. */
function countHearts(svg: string): number {
  return svg.split("M12 21.35l").length - 1;
}

describe("memberCardSvg", () => {
  it("previews uncropped: the shape social platforms show whole", () => {
    const svg = memberCardSvg(base);
    expect(svg).toContain(`viewBox="0 0 ${MEMBER_CARD_WIDTH} ${MEMBER_CARD_HEIGHT}"`);
    // 1.91:1 is what makes a shared card arrive intact.
    expect(MEMBER_CARD_WIDTH / MEMBER_CARD_HEIGHT).toBeCloseTo(1.91, 2);
  });

  it("draws one heart per supported year, plus the brand mark", () => {
    // Three earned hearts and the one in the attribution.
    expect(countHearts(memberCardSvg(base))).toBe(4);
    expect(countHearts(memberCardSvg({ ...base, hearts: 0 }))).toBe(1);
    expect(countHearts(memberCardSvg({ ...base, hearts: 12 }))).toBe(13);
  });

  it("uses no emoji at all — the rasterizer has no font for them", () => {
    const svg = memberCardSvg({ ...base, hearts: 5, recruits: 2 });
    expect(svg).not.toContain("❤️");
    expect(svg).not.toContain("❤");
  });

  it("carries the brand attribution with ø in visible text", () => {
    expect(memberCardSvg(base)).toContain("støttemedlem.no");
  });

  it("says who the member is, who they support, and for how long", () => {
    const svg = memberCardSvg(base);
    expect(svg).toContain("Kari Nordmann");
    expect(svg).toContain("Eksempel Musikkorps");
    expect(svg).toContain("Gyldig medlemskap 2026");
  });

  it("tells the truth about a member whose period has passed", () => {
    const svg = memberCardSvg({ ...base, lapsed: true, periodText: "2024" });
    expect(svg).toContain("Støttet til og med 2024");
    expect(svg).not.toContain("Gyldig medlemskap");
    // The hearts stay: those years were supported.
    expect(countHearts(svg)).toBe(4);
  });

  it("mentions recruits only when there are any", () => {
    expect(memberCardSvg(base)).not.toContain("vervet");
    expect(memberCardSvg({ ...base, recruits: 1 })).toContain("vervet 1 medlem");
    expect(memberCardSvg({ ...base, recruits: 4 })).toContain("vervet 4 medlemmer");
  });

  it("stands without a name, because a member may not have shared one", () => {
    expect(memberCardSvg({ ...base, memberName: null })).toContain("Støttemedlem");
  });

  it("shrinks a long name rather than cutting it straight away", () => {
    const long = memberCardSvg({ ...base, memberName: "Anne-Margrethe Wollertsen Bjørnstad" });
    expect(long).toContain("Anne-Margrethe Wollertsen Bjørnstad");
  });

  it("escapes what people and organizations may actually be called", () => {
    const svg = memberCardSvg({ ...base, organizationName: 'Sang & "Spill" <Nord>' });
    expect(svg).toContain("Sang &amp; &quot;Spill&quot; &lt;Nord&gt;");
    expect(svg).not.toContain("<Nord>");
  });

  it("carries the logo inside the drawing, never as a link out", () => {
    const withLogo = memberCardSvg({ ...base, logoDataUri: "data:image/png;base64,AAAA" });
    expect(withLogo).toContain('href="data:image/png;base64,AAAA"');
    // Always in a circle, like every other place a logo is shown.
    expect(withLogo).toContain('clip-path="url(#logo-circle)"');
    expect(memberCardSvg(base)).not.toContain("<image");
  });

  it("has an upright shape for screens the wide one cannot serve", () => {
    const tall = memberCardSvg({ ...base, shape: "tall" });
    expect(tall).toContain(`viewBox="0 0 ${MEMBER_CARD_TALL_WIDTH} ${MEMBER_CARD_TALL_HEIGHT}"`);
    // Upright means taller than wide — otherwise it is no use to a phone.
    expect(MEMBER_CARD_TALL_HEIGHT).toBeGreaterThan(MEMBER_CARD_TALL_WIDTH);
    expect(memberCardSize("tall")).toEqual({
      width: MEMBER_CARD_TALL_WIDTH,
      height: MEMBER_CARD_TALL_HEIGHT,
    });
    // Wide is what gets shared, so it is what an unasked-for card is.
    expect(memberCardSize()).toEqual({ width: MEMBER_CARD_WIDTH, height: MEMBER_CARD_HEIGHT });
  });

  it("says exactly the same things in both shapes", () => {
    const options = { ...base, hearts: 5, recruits: 2, logoDataUri: "data:image/png;base64,AAAA" };
    const wide = memberCardSvg(options);
    const tall = memberCardSvg({ ...options, shape: "tall" });
    for (const said of [
      "Kari Nordmann",
      "Eksempel Musikkorps",
      "Gyldig medlemskap 2026",
      "5 år som støttemedlem · vervet 2 medlemmer",
      "Skann og bli støttemedlem",
      "støttemedlem.no",
      'href="data:image/png;base64,AAAA"',
    ]) {
      expect(wide).toContain(said);
      expect(tall).toContain(said);
    }
    expect(countHearts(tall)).toBe(countHearts(wide));
  });

  it("keeps every drawn thing inside the canvas, however much there is", () => {
    // The card is laid out by stacking, so the case that would overflow a
    // hand-placed layout — a long name and four rows of hearts — is the one
    // worth proving.
    const crowded = {
      ...base,
      memberName: "Anne-Margrethe Wollertsen Bjørnstad",
      organizationName: "Vestbygda Skolekorps og Ungdomsorkester",
      hearts: 34,
      recruits: 12,
      logoDataUri: "data:image/png;base64,AAAA",
    };
    for (const shape of ["wide", "tall"] as const) {
      const svg = memberCardSvg({ ...crowded, shape });
      const { width, height } = memberCardSize(shape);
      // Every y a text baseline or a shape origin was placed at.
      const ys = [...svg.matchAll(/\by="(-?[\d.]+)"/g)].map((match) => Number(match[1]));
      const xs = [...svg.matchAll(/\bx="(-?[\d.]+)"/g)].map((match) => Number(match[1]));
      expect(Math.min(...ys, ...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThan(height);
      expect(Math.max(...xs)).toBeLessThan(width);
    }
  });

  it("encodes the referral join address in the QR code", () => {
    // The modules are one path, so the proof a URL was encoded is that a
    // different URL draws a different path.
    const mine = memberCardSvg(base);
    const theirs = memberCardSvg({ ...base, joinUrl: `${base.joinUrl}-annen` });
    expect(mine).not.toBe(theirs);
  });
});
