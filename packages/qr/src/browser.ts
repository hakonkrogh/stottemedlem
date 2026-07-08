/**
 * @stottemedlem/qr/browser — browser-only helpers.
 *
 * Rasterizes the SVG card to PNG client-side, so any app (marketing site,
 * admin) can offer PNG downloads without server-side image processing.
 */

export interface SvgToPngOptions {
  /** Multiplier on the SVG's intrinsic size. 3 ≈ print-friendly. */
  scale?: number;
}

/** Rasterize a standalone SVG document (with width/height set) to a PNG blob. */
export async function svgToPngBlob(svg: string, options: SvgToPngOptions = {}): Promise<Blob> {
  const scale = options.scale ?? 3;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context unavailable");
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Trigger a browser download of a blob under the given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load SVG for rasterization"));
    image.src = url;
  });
}
