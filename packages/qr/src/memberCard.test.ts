import { describe, expect, it } from "vitest";
import {
  MEMBER_CARD_HEIGHT,
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
  it("is one upright card — the shape a phone can read and scan", () => {
    const svg = memberCardSvg(base);
    expect(svg).toContain(`viewBox="0 0 ${MEMBER_CARD_WIDTH} ${MEMBER_CARD_HEIGHT}"`);
    // Upright: taller than it is wide, or it is no use on the surface it is for.
    expect(MEMBER_CARD_HEIGHT).toBeGreaterThan(MEMBER_CARD_WIDTH);
    expect(memberCardSize()).toEqual({ width: MEMBER_CARD_WIDTH, height: MEMBER_CARD_HEIGHT });
  });

  it("draws the years as one streak heart carrying the count, plus the brand mark", () => {
    // The streak heart and the one in the attribution — never one per year.
    expect(countHearts(memberCardSvg(base))).toBe(2);
    expect(memberCardSvg(base)).toContain("3 år som støttemedlem!");
    expect(countHearts(memberCardSvg({ ...base, hearts: 12 }))).toBe(2);
    expect(memberCardSvg({ ...base, hearts: 12 })).toContain("12 år som støttemedlem!");
    // Nothing to count means no streak heart at all — only the attribution's.
    expect(countHearts(memberCardSvg({ ...base, hearts: 0 }))).toBe(1);
    expect(memberCardSvg({ ...base, hearts: 0 })).not.toContain("år som støttemedlem");
  });

  it("uses no emoji at all — the rasterizer has no font for them", () => {
    const svg = memberCardSvg({ ...base, hearts: 5, recruits: 2 });
    expect(svg).not.toContain("❤️");
    expect(svg).not.toContain("❤");
  });

  it("carries the brand attribution with ø in visible text", () => {
    expect(memberCardSvg(base)).toContain("støttemedlem.no");
  });

  it("says who the member is, who they support, and until when", () => {
    const svg = memberCardSvg(base);
    expect(svg).toContain("Kari Nordmann");
    expect(svg).toContain("Eksempel Musikkorps");
    // The validity corner: a label over the year, green while current.
    expect(svg).toContain("GYLDIG");
    expect(svg).toContain(">2026</text>");
  });

  it("tells the truth about a member whose period has passed", () => {
    const svg = memberCardSvg({ ...base, lapsed: true, periodText: "2024" });
    expect(svg).toContain("STØTTET T.O.M.");
    expect(svg).toContain(">2024</text>");
    expect(svg).not.toContain("GYLDIG");
    // The streak stays — those years were supported — but the cheer goes.
    expect(svg).toContain("3 år som støttemedlem");
    expect(svg).not.toContain("3 år som støttemedlem!");
    expect(countHearts(svg)).toBe(2);
  });

  it("mentions recruits only when there are any", () => {
    expect(memberCardSvg(base)).not.toContain("Vervet");
    expect(memberCardSvg({ ...base, recruits: 1 })).toContain("Vervet 1 medlem");
    expect(memberCardSvg({ ...base, recruits: 4 })).toContain("Vervet 4 medlemmer");
  });

  it("stands without a name, because a member may not have shared one", () => {
    expect(memberCardSvg({ ...base, memberName: null })).toContain("Støttemedlem");
  });

  it("steps a long name down the scale rather than cutting it straight away", () => {
    const long = memberCardSvg({ ...base, memberName: "Anne-Margrethe Wollertsen Bjørnstad" });
    expect(long).toContain(">Anne-Margrethe Wollertsen Bjørnstad</text>");
    expect(long).toMatch(/font-size="24"[^>]*>Anne-Margrethe/);
  });

  it("sets its text at four sizes and no others, whatever the names are", () => {
    // The number inside the heart is sized to the heart, not to the text.
    const cases = [
      base,
      { ...base, hearts: 34, recruits: 12 },
      { ...base, memberName: "Anne-Margrethe Wollertsen Bjørnstad" },
      { ...base, organizationName: "Sør-Trøndelag Ungdomssymfoniorkester og Musikkforening" },
      { ...base, hearts: 3, lapsed: true, periodText: "2024" },
    ];
    for (const options of cases) {
      const svg = memberCardSvg(options);
      const digit = new RegExp(`font-size="([\\d.]+)"[^>]*>${options.hearts}</text>`).exec(
        svg,
      )?.[1];
      const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)]
        .map((m) => m[1])
        .filter((size) => size !== digit);
      expect(new Set(sizes.map(Number))).toEqual(
        new Set([48, 32, 24, 16].filter((size) => sizes.includes(String(size)))),
      );
      expect(sizes.every((size) => ["48", "32", "24", "16"].includes(size))).toBe(true);
    }
  });

  it("does not label itself above the name", () => {
    expect(memberCardSvg(base)).not.toContain(">STØTTEMEDLEM<");
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

  it("says everything the member needs it to say, in one drawing", () => {
    const svg = memberCardSvg({
      ...base,
      hearts: 5,
      recruits: 2,
      logoDataUri: "data:image/png;base64,AAAA",
    });
    for (const said of [
      "Kari Nordmann",
      "Eksempel Musikkorps",
      "GYLDIG",
      "5 år som støttemedlem!",
      "Vervet 2 medlemmer",
      "Skann og bli støttemedlem",
      "støttemedlem.no",
      'href="data:image/png;base64,AAAA"',
    ]) {
      expect(svg).toContain(said);
    }
  });

  it("keeps every drawn thing inside the canvas, however much there is", () => {
    // The card is laid out by stacking, so the case that would overflow a
    // hand-placed layout — long names, a two-digit streak, everything on — is
    // the one worth proving.
    const crowded = {
      ...base,
      memberName: "Anne-Margrethe Wollertsen Bjørnstad",
      organizationName: "Vestbygda Skolekorps og Ungdomsorkester",
      hearts: 34,
      recruits: 12,
      logoDataUri: "data:image/png;base64,AAAA",
    };
    const svg = memberCardSvg(crowded);
    const { width, height } = memberCardSize();
    // Every y a text baseline or a shape origin was placed at.
    const ys = [...svg.matchAll(/\by="(-?[\d.]+)"/g)].map((match) => Number(match[1]));
    const xs = [...svg.matchAll(/\bx="(-?[\d.]+)"/g)].map((match) => Number(match[1]));
    expect(Math.min(...ys, ...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThan(height);
    expect(Math.max(...xs)).toBeLessThan(width);
  });

  it("breaks a name that would run the width of the band, though it would fit", () => {
    const svg = memberCardSvg({
      ...base,
      organizationName: "Store Bergan Skolekorps",
      logoDataUri: "data:image/png;base64,AAAA",
    });
    // Two lines beside the logo instead of one line reaching for the year.
    expect(svg).toContain(">Store Bergan</text>");
    expect(svg).toContain(">Skolekorps</text>");
    expect(svg).not.toContain(">Store Bergan Skolekorps</text>");
    // Breaking is not shrinking: the band keeps the title step.
    const size = Number(/font-size="([\d.]+)"[^>]*>Store Bergan</.exec(svg)?.[1]);
    expect(size).toBe(32);
  });

  it("keeps a short organization name on one line", () => {
    const svg = memberCardSvg({ ...base, organizationName: "Eksempel Musikkorps" });
    expect(svg).toContain(">Eksempel Musikkorps</text>");
  });

  it("sets a long organization name on two lines rather than shrinking it", () => {
    // Beside a logo, where the band has the least room.
    const svg = memberCardSvg({
      ...base,
      organizationName: "Vestbygda Skolekorps og Ungdomsorkester",
      logoDataUri: "data:image/png;base64,AAAA",
    });
    // Broken between words, and not so that the second line opens with "og".
    expect(svg).toContain(">Vestbygda Skolekorps og</text>");
    expect(svg).toContain(">Ungdomsorkester</text>");
    // Still at the scale's title step, bigger than the year beside it:
    // wrapping bought the room, so nothing had to shrink.
    const size = Number(/font-size="([\d.]+)"[^>]*>Vestbygda/.exec(svg)?.[1]);
    expect(size).toBe(32);
  });

  it("wraps a very long organization name onto three even lines, never mid-word", () => {
    const name = "Sør-Trøndelag Ungdomssymfoniorkester og Musikkforening";
    // With a logo the band is at its narrowest; no streak, so the band's ink
    // colour picks out the organization's lines and nothing else.
    const svg = memberCardSvg({
      ...base,
      organizationName: name,
      hearts: 0,
      logoDataUri: "data:image/png;base64,AAAA",
    });
    const lines = [...svg.matchAll(/<text [^>]*fill="#3b2d1c"[^>]*>([^<]*)<\/text>/g)].map(
      (match) => match[1],
    );
    expect(lines).toHaveLength(3);
    // Every word, in order, each whole: the lines re-join to the name itself.
    expect(lines.join(" ")).toBe(name);
    expect(svg).not.toContain("…");
  });

  it("encodes the referral join address in the QR code", () => {
    // The modules are one path, so the proof a URL was encoded is that a
    // different URL draws a different path.
    const mine = memberCardSvg(base);
    const theirs = memberCardSvg({ ...base, joinUrl: `${base.joinUrl}-annen` });
    expect(mine).not.toBe(theirs);
  });
});
