import fraunces from "../assets/fonts/Fraunces.ttf?inline";

/**
 * The typeface both cards are set in, as bytes that travel with the drawing.
 *
 * A card is looked at as a picture (specs/concepts/brand-palette.md): an
 * `<img>` in the back office, an `<img>` on a club's own website, a PNG in an
 * email, a file dropped into a poster. An SVG loaded that way fetches no
 * webfont, and the Worker that rasterizes has no system font at all, so the
 * face has to be inside the file or the card is not in the product's hand.
 *
 * This module is deliberately free of anything Worker-only, so a story can
 * embed the same font in the same way and show what the app really serves.
 */

/** The card's own typeface must be named exactly as the SVG asks for it. */
export const CARD_FONT_FAMILY = "Fraunces";

/** The same 73 KB brand-cut instance the rasterizer holds, as a data URI. */
export const CARD_FONT_DATA_URI = String(fraunces);

/**
 * A card with its typeface riding inside, for serving or showing the SVG.
 *
 * Carried as ~97 KB of base64 on the response, cacheable. The weight range
 * spans the face so a browser never fakes a bold on top of it.
 *
 * Only a SVG shown to a browser gets this: the rasterizer holds the same font
 * as bytes and needs no `@font-face`, and the stored-PNG cache keys digest the
 * SVG, so injecting it there would only churn perfectly good cached pictures.
 *
 * `font-display: swap` is what keeps the card's words on the card. A browser's
 * default for a face it is still resolving is to draw the text INVISIBLY for
 * up to three seconds, and an `<img>` is a picture, drawn once, with no second
 * paint promised to anybody. Lose that race and the member is handed a card
 * with a logo, a heart and a QR code and not one word on it, which is exactly
 * what a card must never be (specs/concepts/member-card.md). With `swap` the
 * words are there from the first paint in the fallback serif, and turn into
 * Fraunces the moment the face is ready.
 */
export function withEmbeddedCardFont(svg: string): string {
  const face = `<style>@font-face{font-family:${CARD_FONT_FAMILY};font-weight:300 900;font-display:swap;src:url(${CARD_FONT_DATA_URI}) format("truetype")}</style>`;
  return svg.replace("</title>", `</title>\n  ${face}`);
}
