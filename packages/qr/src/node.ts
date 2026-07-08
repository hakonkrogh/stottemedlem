/**
 * @stottemedlem/qr/node — PNG encoding for Node-compatible runtimes.
 *
 * Kept out of the main entry so browser bundles never pull in the PNG
 * encoder (pngjs/zlib). Works on Cloudflare Workers with `nodejs_compat`.
 */

import { toBuffer } from "qrcode";
import type { QrOptions } from "./index.js";

/** A plain QR code as a PNG buffer, print-quality by default. */
export async function qrPngBuffer(url: string, options: QrOptions = {}): Promise<Buffer> {
  return toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    width: options.width ?? 1024,
    margin: options.margin ?? 2,
  });
}
