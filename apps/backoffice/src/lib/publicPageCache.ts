import { CANONICAL_ORIGIN, joinPagePath } from "@stottemedlem/core";

// The public org pages (/bli-medlem/[slug] + /bli-medlem/[slug]/vilkar) are served from the
// Worker cache and revalidated in the background on every visit (see
// src/worker.ts and specs/concepts/join-page.md). The cache is
// per-datacenter, so it cannot be purged globally from here — visits handle
// that. This best-effort purge only clears the copies in the datacenter the
// saving administrator hits, so *their* next look at the public page shows the
// fresh version straight away.

/**
 * The named cache the public org pages live in. A named cache (rather than
 * `caches.default`) keeps the Cache API typing identical between the Worker
 * entry and Astro app code, and namespaces our entries.
 */
export const PUBLIC_ORG_PAGE_CACHE = "public-org-pages";

/** The cache keys worker.ts stores a slug's public pages under, per origin. */
function publicPageCacheKeys(slug: string, requestOrigin: string): string[] {
  // Public traffic lands on the canonical apex origin (zone route); admins in
  // dev or on the app host may look at the same pages on the request origin.
  const origins = new Set([CANONICAL_ORIGIN, requestOrigin]);
  return [...origins].flatMap((origin) => [
    `${origin}${joinPagePath(slug)}`,
    `${origin}${joinPagePath(slug)}/vilkar`,
  ]);
}

/** Best-effort, same-datacenter purge of an org's cached public pages. */
export async function purgeOrgPublicPages(slug: string, requestOrigin: string): Promise<void> {
  const cache = await caches.open(PUBLIC_ORG_PAGE_CACHE);
  await Promise.all(publicPageCacheKeys(slug, requestOrigin).map((url) => cache.delete(url)));
}
