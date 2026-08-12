import type { R2Bucket } from "@cloudflare/workers-types";
import type { Organization } from "@stottemedlem/db";

// Uploaded org media (logo + banner) in the MEDIA R2 bucket. Object keys are
// content-hashed (`org/<id>/<kind>-<hash>.<ext>`) so the public image URLs can
// carry a `?v=` that changes whenever the image does, allowing immutable
// caching without stale images after a replace.

export type OrgImageKind = "logo" | "banner";

const MAX_BYTES: Record<OrgImageKind, number> = {
  logo: 2 * 1024 * 1024,
  banner: 5 * 1024 * 1024,
};

const MAX_LABEL: Record<OrgImageKind, string> = { logo: "2 MB", banner: "5 MB" };

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Identify the image format from its magic bytes. Only raster formats are
 * accepted — SVG is deliberately excluded because stored SVGs are served from
 * our origin and can carry scripts.
 */
export function sniffImageType(bytes: Uint8Array): keyof typeof EXTENSION | null {
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length > 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export interface ImageFieldResult {
  /** New object key; `null` to clear the image; `undefined` for no change. */
  key?: string | null;
  error?: string;
}

/**
 * Apply one image field of the settings form: store a newly uploaded file in
 * R2 (deleting the previous object), or delete it when the remove box was
 * ticked. Returns the resulting key change, or a user-facing error.
 */
export async function applyImageField(
  media: R2Bucket,
  org: Organization,
  kind: OrgImageKind,
  form: FormData,
): Promise<ImageFieldResult> {
  const currentKey = kind === "logo" ? org.logoKey : org.bannerKey;
  const file = form.get(kind);
  const remove = form.get(`${kind}Remove`) === "1";

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES[kind]) {
      return { error: `Bildet er for stort — maks ${MAX_LABEL[kind]}.` };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) {
      return { error: "Bildet må være PNG, JPEG eller WebP." };
    }
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest).slice(0, 8)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const key = `org/${org.id}/${kind}-${hash}.${EXTENSION[type]}`;
    await media.put(key, bytes, { httpMetadata: { contentType: type } });
    if (currentKey && currentKey !== key) await media.delete(currentKey);
    return { key };
  }

  if (remove && currentKey) {
    await media.delete(currentKey);
    return { key: null };
  }

  return {};
}

/**
 * Public URL for an org image, versioned by the content hash embedded in the
 * object key so replaced images bust caches. Relative — the same Worker serves
 * both the back office host and the public /org/* pages.
 */
export function orgImageUrl(slug: string, kind: OrgImageKind, key: string): string {
  const version = key.slice(key.lastIndexOf("/") + 1).replace(`${kind}-`, "");
  return `/org/${slug}/${kind}?v=${encodeURIComponent(version)}`;
}

/** Serve a stored org image from R2 (the GET handler for /org/<slug>/<kind>). */
export async function serveOrgImage(media: R2Bucket, key: string | null): Promise<Response> {
  if (!key) return new Response("Ikke funnet", { status: 404 });
  const object = await media.get(key);
  if (!object) return new Response("Ikke funnet", { status: 404 });
  return new Response(object.body as unknown as BodyInit, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      // The HTML always links these with a content-hash `?v=`, so long
      // immutable caching is safe; replaced images get a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
