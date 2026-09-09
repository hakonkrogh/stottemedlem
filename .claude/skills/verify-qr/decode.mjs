#!/usr/bin/env node
/**
 * Decode a QR code from a PNG (file path or URL) and print its payload.
 * Exits non-zero if nothing decodes or the payload doesn't match --expect.
 *
 *   node decode.mjs <png-path-or-url> [--expect <payload>] [--shrink [--min <px>]]
 *
 * `--shrink` answers the question a plain decode cannot: not "does this scan"
 * but "how small may it be drawn and still scan". It halves the picture down
 * step by step and reports the narrowest width that still decodes, which is
 * the number to compare before and after any change to a QR's payload or the
 * artwork around it (specs/concepts/member-card.md).
 */
import fs from "node:fs";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const expected = value("--expect");
const minWidth = Number(value("--min") ?? 120);
const named = new Set(["--expect", "--min"]);
const source = args.filter((arg, i) => !arg.startsWith("--") && !named.has(args[i - 1]))[0];

if (!source) {
  console.error(
    "usage: node decode.mjs <png-path-or-url> [--expect <payload>] [--shrink [--min <px>]]",
  );
  process.exit(2);
}

const bytes = /^https?:\/\//.test(source)
  ? Buffer.from(await (await fetch(source)).arrayBuffer())
  : fs.readFileSync(source);

const png = PNG.sync.read(bytes);

/** Decode one RGBA buffer, or null. */
function decode({ data, width, height }) {
  return jsQR(new Uint8ClampedArray(data), width, height)?.data ?? null;
}

/**
 * Box-filter downscale to `width`, keeping the aspect ratio. Averaging rather
 * than sampling on purpose: a nearest-neighbour shrink drops whole modules and
 * makes a code look unscannable long before a real screen or printer would.
 */
function shrinkTo(image, width) {
  const height = Math.max(1, Math.round((image.height * width) / image.width));
  const out = Buffer.alloc(width * height * 4);
  const scaleX = image.width / width;
  const scaleY = image.height / height;
  for (let y = 0; y < height; y++) {
    const fromY = Math.floor(y * scaleY);
    const toY = Math.max(fromY + 1, Math.floor((y + 1) * scaleY));
    for (let x = 0; x < width; x++) {
      const fromX = Math.floor(x * scaleX);
      const toX = Math.max(fromX + 1, Math.floor((x + 1) * scaleX));
      const sums = [0, 0, 0, 0];
      let count = 0;
      for (let sy = fromY; sy < toY; sy++) {
        for (let sx = fromX; sx < toX; sx++) {
          const at = (sy * image.width + sx) * 4;
          for (let channel = 0; channel < 4; channel++) sums[channel] += image.data[at + channel];
          count++;
        }
      }
      const at = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) out[at + channel] = sums[channel] / count;
    }
  }
  return { data: out, width, height };
}

const payload = decode(png);
if (!payload) {
  console.error("FAILED: no QR code decoded");
  process.exit(1);
}
console.log(payload);

if (flag("--shrink")) {
  // Step down in 10% cuts: fine enough to name a real floor, coarse enough
  // that a whole sweep is a second's work.
  let smallest = png.width;
  for (
    let width = Math.round(png.width * 0.9);
    width >= minWidth;
    width = Math.round(width * 0.9)
  ) {
    const at = decode(shrinkTo(png, width));
    console.log(`  ${String(width).padStart(5)} px wide: ${at ? "decodes" : "no"}`);
    if (!at) break;
    smallest = width;
  }
  console.log(`smallest width that still decodes: ${smallest} px (drawn at ${png.width} px)`);
}

if (expected !== undefined && payload !== expected) {
  console.error(`FAILED: expected "${expected}"`);
  process.exit(1);
}
