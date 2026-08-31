#!/usr/bin/env node
/**
 * Decode a QR code from a PNG (file path or URL) and print its payload.
 * Exits non-zero if nothing decodes or the payload doesn't match --expect.
 *
 *   node decode.mjs <png-path-or-url> [--expect <payload>]
 */
import fs from "node:fs";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const args = process.argv.slice(2);
const expectIndex = args.indexOf("--expect");
const expected = expectIndex === -1 ? undefined : args[expectIndex + 1];
// Without --expect, expectIndex is -1 and `i !== expectIndex + 1` would drop
// argument 0 — the source itself — leaving only the usage message behind.
const source = args.filter(
  (_, i) => expectIndex === -1 || (i !== expectIndex && i !== expectIndex + 1),
)[0];

if (!source) {
  console.error("usage: node decode.mjs <png-path-or-url> [--expect <payload>]");
  process.exit(2);
}

const bytes = /^https?:\/\//.test(source)
  ? Buffer.from(await (await fetch(source)).arrayBuffer())
  : fs.readFileSync(source);

const png = PNG.sync.read(bytes);
const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (!result) {
  console.error("FAILED: no QR code decoded");
  process.exit(1);
}
console.log(result.data);
if (expected !== undefined && result.data !== expected) {
  console.error(`FAILED: expected "${expected}"`);
  process.exit(1);
}
