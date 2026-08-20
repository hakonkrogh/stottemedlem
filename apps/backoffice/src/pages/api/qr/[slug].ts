import { joinPageUrl } from "@stottemedlem/core";
import { qrCardSvg, qrSvg } from "@stottemedlem/qr";
import { qrPngBuffer } from "@stottemedlem/qr/node";
import type { APIRoute } from "astro";

/**
 * An organization's QR code card (and plain QR code) as an image.
 *
 * This is the stable address external websites hot-link to embed the card,
 * and the download source for administrators:
 *
 *   GET /api/qr/[slug]                        → card as SVG (default)
 *   GET /api/qr/[slug]?variant=qr&format=png  → plain QR code as PNG
 *   GET /api/qr/[slug]?variant=qr&format=svg  → plain QR code as SVG
 *   ?name=…      display name on the card (until organizations are persisted,
 *                the name travels in the URL; the slug is the fallback)
 *   ?download=1  serve as attachment
 *
 * The QR code always encodes the canonical join page, never a local or
 * per-deploy origin — printed codes must survive any move of this Worker.
 */

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62})$/;

const CACHE_HEADER = "public, max-age=3600, s-maxage=86400";

function nameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug ?? "";
  if (!SLUG_PATTERN.test(slug)) {
    return new Response("Ugyldig organisasjonsnavn i adressen.", { status: 400 });
  }

  const variant = url.searchParams.get("variant") ?? "card";
  const format = url.searchParams.get("format") ?? (variant === "qr" ? "png" : "svg");
  const name = url.searchParams.get("name")?.trim() || nameFromSlug(slug);
  const download = url.searchParams.get("download") === "1";
  const joinUrl = joinPageUrl(slug);

  const headers = new Headers({ "Cache-Control": CACHE_HEADER });
  const attach = (filename: string) => {
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }
  };

  if (variant === "card") {
    if (format !== "svg") {
      return new Response("Kortet serveres som SVG; be om variant=qr for PNG.", { status: 400 });
    }
    headers.set("Content-Type", "image/svg+xml; charset=utf-8");
    attach(`stottemedlem-kort-${slug}.svg`);
    return new Response(qrCardSvg({ joinUrl, organizationName: name }), { headers });
  }

  if (variant === "qr") {
    if (format === "png") {
      const png = await qrPngBuffer(joinUrl);
      headers.set("Content-Type", "image/png");
      attach(`stottemedlem-qr-${slug}.png`);
      return new Response(new Uint8Array(png), { headers });
    }
    if (format === "svg") {
      headers.set("Content-Type", "image/svg+xml; charset=utf-8");
      attach(`stottemedlem-qr-${slug}.svg`);
      return new Response(await qrSvg(joinUrl), { headers });
    }
    return new Response("Ukjent format. Bruk format=png eller format=svg.", { status: 400 });
  }

  return new Response("Ukjent variant. Bruk variant=card eller variant=qr.", { status: 400 });
};
