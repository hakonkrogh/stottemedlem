import { describe, expect, it } from "vitest";
import { MEMBER_CARD_HEIGHT, MEMBER_CARD_WIDTH, memberCardSvg } from "./memberCard.js";

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

  it("encodes the referral join address in the QR code", () => {
    // The modules are one path, so the proof a URL was encoded is that a
    // different URL draws a different path.
    const mine = memberCardSvg(base);
    const theirs = memberCardSvg({ ...base, joinUrl: `${base.joinUrl}-annen` });
    expect(mine).not.toBe(theirs);
  });
});
