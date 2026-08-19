import { handle } from "@astrojs/cloudflare/handler";

// Public org pages (specs/concepts/org-landing-page.md): the landing page and
// salgsvilkår are served stale-while-revalidate — a visit gets the cached copy
// instantly and refreshes it in the background, so a change on the org's side
// is visible at the latest from the next visit. The cache is per-datacenter;
// the back office additionally purges its own datacenter's copy on save
// (src/lib/publicPageCache.ts — keep the cache name and key shape in sync).
const PUBLIC_ORG_PAGE = /^\/org\/[a-z0-9-]+(?:\/vilkar)?\/?$/;
const PUBLIC_ORG_PAGE_CACHE = "public-org-pages";
// Backstop for how long an unvisited copy may keep serving; every visit
// refreshes it long before this matters.
const CACHE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function withCacheStatus(response: Response, status: "hit" | "miss"): Response {
  const tagged = new Response(response.body, response);
  tagged.headers.set("x-sm-cache", status);
  return tagged;
}

/**
 * Render the page through Astro and, when it is a cacheable success, store a
 * copy under the normalized cache key. `s-maxage` governs the Worker cache;
 * `max-age=0` keeps browsers coming back so revalidation actually happens.
 */
async function renderAndCache(
  cacheKey: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const response = await handle(request, env, ctx);
  if (response.status === 200 && !response.headers.has("set-cookie")) {
    const copy = response.clone();
    const headers = new Headers(copy.headers);
    headers.set("cache-control", `public, max-age=0, s-maxage=${CACHE_MAX_AGE_SECONDS}`);
    const cache = await caches.open(PUBLIC_ORG_PAGE_CACHE);
    ctx.waitUntil(cache.put(cacheKey, new Response(copy.body, { status: 200, headers })));
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && PUBLIC_ORG_PAGE.test(url.pathname)) {
      // Normalized key: no query, no trailing slash — one copy per page.
      const cacheKey = url.origin + url.pathname.replace(/\/+$/, "");
      const cache = await caches.open(PUBLIC_ORG_PAGE_CACHE);
      const cached = await cache.match(cacheKey);
      if (cached) {
        // Serve stale instantly; refresh in the background for the next visit.
        ctx.waitUntil(renderAndCache(cacheKey, new Request(cacheKey), env, ctx));
        return withCacheStatus(cached, "hit");
      }
      return withCacheStatus(await renderAndCache(cacheKey, request, env, ctx), "miss");
    }
    return handle(request, env, ctx);
  },

  // Cron Triggers (wrangler.jsonc `triggers.crons`). Implementations land in
  // later scaffolding steps: renewal-charge creation, nightly reconciliation.
  async scheduled(controller, _env, _ctx) {
    console.log(
      `scheduled tick ${controller.cron} @ ${new Date(controller.scheduledTime).toISOString()} — no jobs yet`,
    );
  },

  // Consumer for the Vipps webhook event queue. Idempotent event processing
  // lands with the webhook pipeline (scaffolding step 6).
  async queue(batch, _env) {
    console.log(`queue ${batch.queue}: ${batch.messages.length} message(s) — no consumer yet`);
    for (const message of batch.messages) {
      message.ack();
    }
  },
} satisfies ExportedHandler<Env>;
