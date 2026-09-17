#!/usr/bin/env node
/**
 * How much of a QR code may a logo cover before it stops decoding?
 *
 *   node budget.mjs "<payload>" [--ec L,M,Q,H] [--cover <percent-of-width>]
 *
 * `decode.mjs` answers "does this picture scan" and "how small may it be
 * drawn". Neither answers the question you have BEFORE drawing anything: the
 * product wants a heart in the middle of the code, so how big may it be, and
 * does it force the error-correction level up?
 *
 * The QR standard (ISO/IEC 18004) has nothing to say about logos. It neither
 * allows nor forbids them, because a logo is not a feature, it is damage that
 * Reed-Solomon happens to absorb (~7% of codewords at L, ~15% M, ~25% Q, ~30%
 * H). So the only honest answer is a measured one, which is what this prints:
 * the largest centred blank square that still decodes, per level.
 *
 * It models the cover as a WHITE SQUARE, which is both conservative (a square
 * hides more than the heart shape inside it) and accurate (a logo on a QR
 * needs a white pad under it anyway, or the binarizer reads its dark pixels as
 * modules). Sizes are in MODULES, not pixels, so the answer survives the code
 * being drawn at any size.
 */
import { createRequire } from "node:module";
import jsQR from "jsqr";

const require = createRequire(import.meta.url);
const { create } = require("qrcode");

const args = process.argv.slice(2);
const value = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const named = new Set(["--ec", "--cover"]);
const payload = args.filter((arg, i) => !arg.startsWith("--") && !named.has(args[i - 1]))[0];
const levels = (value("--ec") ?? "L,M,Q,H").split(",").map((level) => level.trim().toUpperCase());
const cover = value("--cover") === undefined ? undefined : Number(value("--cover"));

if (!payload) {
  console.error('usage: node budget.mjs "<payload>" [--ec L,M,Q,H] [--cover <percent-of-width>]');
  process.exit(2);
}

/** Pixels per module when rendering. Generous: the shrink pass does the cutting. */
const SCALE = 16;
/** The quiet zone the standard requires, and which a cover must never eat into. */
const MARGIN = 4;

/**
 * Draw the code to greyscale, with `hole` modules blanked white in the middle.
 * Greyscale rather than RGBA because every pass here averages pixels; the
 * colour only matters at the very end, when jsQR wants a buffer.
 */
function render(qr, hole) {
  const size = qr.modules.size;
  const dim = (size + MARGIN * 2) * SCALE;
  const grey = new Float64Array(dim * dim).fill(1);
  const paint = (col, row, dark) => {
    for (let y = 0; y < SCALE; y++) {
      const at = ((row + MARGIN) * SCALE + y) * dim + (col + MARGIN) * SCALE;
      grey.fill(dark ? 0 : 1, at, at + SCALE);
    }
  };
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) if (qr.modules.get(row, col)) paint(col, row, true);
  if (hole > 0) {
    const from = Math.round((size - hole) / 2);
    for (let row = from; row < from + hole; row++)
      for (let col = from; col < from + hole; col++) paint(col, row, false);
  }
  return { grey, dim };
}

/**
 * Box-filter downscale to `width` and decode, the same averaging `decode.mjs`
 * uses: sampling drops whole modules and calls a code dead long before a real
 * camera would.
 */
function decodeAt(grey, dim, width) {
  const data = new Uint8ClampedArray(width * width * 4);
  const scale = dim / width;
  for (let y = 0; y < width; y++) {
    const fromY = Math.floor(y * scale);
    const toY = Math.max(fromY + 1, Math.floor((y + 1) * scale));
    for (let x = 0; x < width; x++) {
      const fromX = Math.floor(x * scale);
      const toX = Math.max(fromX + 1, Math.floor((x + 1) * scale));
      let sum = 0;
      let count = 0;
      for (let sy = fromY; sy < toY; sy++)
        for (let sx = fromX; sx < toX; sx++) {
          sum += grey[sy * dim + sx];
          count++;
        }
      const at = (y * width + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = Math.round((sum / count) * 255);
      data[at + 3] = 255;
    }
  }
  return jsQR(data, width, width)?.data === payload;
}

/** The narrowest the whole picture may be drawn and still decode, in px. */
function shrinkFloor(qr, hole) {
  const { grey, dim } = render(qr, hole);
  if (!decodeAt(grey, dim, dim)) return null;
  let low = 20;
  let high = dim;
  let best = dim;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (decodeAt(grey, dim, mid)) {
      best = mid;
      high = mid - 1;
    } else low = mid + 1;
  }
  return best;
}

/**
 * The largest centred blank square that still decodes, walked upwards one
 * module at a time. Upwards and not bisected on purpose: the failure is not
 * guaranteed monotonic (a hole one module wider can shift which codeword
 * blocks it damages), so the first failure is the honest ceiling to report.
 */
function largestHole(qr) {
  const size = qr.modules.size;
  for (let hole = 1; hole <= size; hole++) {
    const { grey, dim } = render(qr, hole);
    if (!decodeAt(grey, dim, dim)) return hole - 1;
  }
  return size;
}

console.log(`payload: ${payload} (${payload.length} chars)`);
if (cover !== undefined) console.log(`proposed cover: ${cover}% of the code's width`);

for (const ec of levels) {
  const qr = create(payload, { errorCorrectionLevel: ec });
  const size = qr.modules.size;
  const max = largestHole(qr);
  const pct = (max / size) * 100;
  const bare = shrinkFloor(qr, 0);
  console.log(
    `\nEC ${ec}: version ${qr.version}, ${size}x${size} modules, decodes down to ${bare} px bare`,
  );
  console.log(
    `  breaks above a centred cover of ${max} modules = ${pct.toFixed(0)}% of width (${(((max * max) / (size * size)) * 100).toFixed(1)}% of area)`,
  );
  // Half the breaking point: the measurement below is jsQR on clean synthetic
  // pixels, which is kinder than a phone camera on printed paper.
  const safe = Math.floor(size * (pct / 100 / 2));
  console.log(`  safe to draw: ${safe} modules = ${((safe / size) * 100).toFixed(0)}% of width`);
  if (cover !== undefined) {
    const hole = Math.round(size * (cover / 100));
    const floor = shrinkFloor(qr, hole);
    const verdict = floor === null ? "DOES NOT DECODE" : `decodes down to ${floor} px`;
    const headroom = pct / cover;
    console.log(
      `  at ${cover}% (${hole} modules): ${verdict}` +
        (floor === null ? "" : ` (${headroom.toFixed(1)}x inside the breaking point)`),
    );
  }
}
