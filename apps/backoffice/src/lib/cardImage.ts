import { env } from "cloudflare:workers";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasm from "@resvg/resvg-wasm/index_bg.wasm";
import { MEMBER_CARD_WIDTH } from "@stottemedlem/qr";
import fraunces from "../assets/fonts/Fraunces.ttf?inline";

/**
 * Turning the member's card (specs/concepts/member-card.md) into a real
 * picture.
 *
 * A shared card has to preview in a social feed and travel in an email, and
 * neither accepts SVG — so the same drawing is rasterized here. Two things a
 * Worker does not have and therefore ships with the code:
 *
 *  - **A WebAssembly renderer.** Workers cannot compile WebAssembly at
 *    runtime, so the module is imported (the Cloudflare Vite plugin emits it
 *    beside the bundle) rather than fetched.
 *  - **Fonts.** There is no system font to fall back on: text drawn in a font
 *    the renderer does not hold renders as nothing at all. The card's one
 *    typeface is embedded, and it is the same Fraunces the rest of the product
 *    is set in.
 */

/** The card's own typeface must be named exactly as the SVG asks for it. */
export const CARD_FONT_FAMILY = "Fraunces";

/**
 * The card with its typeface riding inside — for serving the SVG to browsers.
 *
 * An SVG embedded as `<img>` loads no webfonts, so without this the card's
 * text falls back to Georgia on the very pages the card exists for. The font
 * is the same 73 KB brand-cut instance the rasterizer embeds, carried as a
 * data URI (~97 KB of base64 on the response, cacheable). The weight range
 * spans the face so a browser never fakes a bold on top of it.
 *
 * Only the SERVED SVG gets this: the rasterizer holds the same font as bytes
 * and needs no @font-face, and the stored-PNG cache keys digest the SVG, so
 * injecting it there would only churn perfectly good cached pictures.
 */
export function withEmbeddedCardFont(svg: string): string {
  const face = `<style>@font-face{font-family:${CARD_FONT_FAMILY};font-weight:300 900;src:url(${String(fraunces)}) format("truetype")}</style>`;
  return svg.replace("</title>", `</title>\n  ${face}`);
}

let wasmReady: Promise<void> | null = null;
let fontBytes: Uint8Array | null = null;

function decodeFont(): Uint8Array {
  if (fontBytes) return fontBytes;
  // Vite inlines the file as a base64 data URI; the renderer wants the bytes.
  const base64 = String(fraunces).split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  fontBytes = bytes;
  return bytes;
}

/**
 * Render a card SVG to a PNG.
 *
 * `width` is the pixel width to render at; the card's own aspect ratio is
 * kept, so asking for a wider image gives a sharper one rather than a
 * differently shaped one.
 */
export async function renderCardPng(
  svg: string,
  width = MEMBER_CARD_WIDTH,
): Promise<Uint8Array<ArrayBuffer>> {
  wasmReady ??= initWasm(wasm as WebAssembly.Module);
  await wasmReady;

  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontBuffers: [decodeFont()],
      defaultFontFamily: CARD_FONT_FAMILY,
      // There are none, and letting the renderer look for them only costs time.
      loadSystemFonts: false,
    },
  });
  return new Uint8Array(renderer.render().asPng());
}

/**
 * The same picture, drawn once and kept.
 *
 * Rasterizing is by an order of magnitude the most expensive thing this
 * product asks a Worker to do — far more than a whole ordinary request — while
 * the card itself changes only when something on it changes: a new period,
 * another heart, a recruit, a new name or logo. So the drawing decides the
 * address. The key is a digest of the SVG, which means there is nothing to
 * invalidate and nothing to remember: a card that has changed simply asks for
 * a picture that does not exist yet and gets drawn, and a card that has not
 * is read back instead of redrawn.
 *
 * Kept under the card's own token so the stored pictures of one member's card
 * stay findable — and so a member erased from the register takes their
 * pictures with them.
 */
export async function storedCardPng(
  cardToken: string,
  svg: string,
  width = MEMBER_CARD_WIDTH,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await cardImageKey(cardToken, svg, width);
  const stored = await env.MEDIA.get(key);
  if (stored) return new Uint8Array(await stored.arrayBuffer());

  const png = await renderCardPng(svg, width);
  // Keeping the picture is an optimization, never the point: a bucket that
  // will not take it must not cost the member their card.
  try {
    await env.MEDIA.put(key, png);
  } catch {
    // Drawn is drawn — the next asker simply draws it again.
  }
  return png;
}

/** Where one drawing of one card lives: `cards/<token>/<digest of the drawing>.png`. */
async function cardImageKey(cardToken: string, svg: string, width: number): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${width}:${svg}`));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `cards/${encodeURIComponent(cardToken)}/${hex}.png`;
}

/** Image types the card may embed — the ones organizations can upload. */
const MIME_BY_MAGIC: Array<[string, number[]]> = [
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
];

/**
 * The organization's logo as a data URI, or null when it has none.
 *
 * The card must be one self-contained file: a rasterizer cannot follow a link
 * out to R2, and neither can a mail client reading the card offline. So the
 * logo is carried inside the drawing rather than referenced.
 *
 * WebP is skipped deliberately — the renderer cannot decode it, and a card
 * with a blank hole where the logo should be is worse than a card with no
 * logo at all.
 */
export async function orgLogoDataUri(logoKey: string | null): Promise<string | null> {
  if (!logoKey) return null;
  const object = await env.MEDIA.get(logoKey);
  if (!object) return null;

  const bytes = new Uint8Array(await object.arrayBuffer());
  const mime = MIME_BY_MAGIC.find(([, magic]) =>
    magic.every((byte, index) => bytes[index] === byte),
  )?.[0];
  if (!mime) return null;

  let binary = "";
  // Chunked: spreading a whole image into String.fromCharCode at once blows
  // the argument limit on anything but a thumbnail.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
