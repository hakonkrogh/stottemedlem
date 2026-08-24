import { handle } from "@astrojs/cloudflare/handler";
import { JOIN_PAGE_PATH_SEGMENT } from "@stottemedlem/core";

// Public org pages (specs/concepts/join-page.md): the join page and its
// salgsvilkår are served stale-while-revalidate — a visit gets the cached copy
// instantly and refreshes it in the background, so a change on the org's side
// is visible at the latest from the next visit. The cache is per-datacenter;
// the back office additionally purges its own datacenter's copy on save
// (src/lib/publicPageCache.ts — keep the cache name and key shape in sync).
const PUBLIC_ORG_PAGE = new RegExp(`^/${JOIN_PAGE_PATH_SEGMENT}/[a-z0-9-]+(?:/vilkar)?/?$`);

// The join page's former address. A join page's address must never break once
// printed or registered with a payment provider (specs/concepts/join-page.md),
// and /org/<slug> was live and registrable, so every path beneath it — pages
// and image endpoints alike — is redirected permanently rather than dropped.
const FORMER_ORG_PAGE_PREFIX = "/org/";
const PUBLIC_ORG_PAGE_CACHE = "public-org-pages";
/** The nightly run that also arranges next year's payments (wrangler.jsonc). */
const RENEWAL_CRON = "0 4 * * *";
/** The earlier nightly run, which reads memberships back from Vipps first. */
const RECONCILE_CRON = "0 2 * * *";
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

/**
 * Visit every organization that can take payments and bring it up to date.
 * Imported lazily so the fetch path — every page view — never pays for
 * loading the jobs.
 */
async function runScheduledJobs(cron: string): Promise<void> {
  const [{ getDb }, { getVippsForOrg }, { getWorkOS }, { listOrganizations }, renewals, reconcile] =
    await Promise.all([
      import("./lib/db"),
      import("./lib/vipps"),
      import("./lib/workos"),
      import("@stottemedlem/db"),
      import("./lib/renewals"),
      import("./lib/reconcile"),
    ]);

  const db = getDb();
  const workos = getWorkOS();
  const arrangeRenewals = cron === RENEWAL_CRON;
  const reconcileFirst = cron === RECONCILE_CRON;

  for (const org of await listOrganizations(db)) {
    try {
      const vipps = await getVippsForOrg(workos, org.workosOrgId);
      // An organization that has not connected Vipps has nothing to renew.
      if (!vipps) continue;

      // Reconciliation runs before anything else acts on our record, so the
      // night's decisions are made against what Vipps actually holds rather
      // than against whatever we happened to be told
      // (specs/concepts/payment-reconciliation.md).
      if (reconcileFirst) {
        const report = await reconcile.reconcileOrganization(db, vipps, org.id);
        if (reconcile.isNoteworthy(report)) {
          console.log(
            `${org.slug}: reconciled ${report.visited} — ` +
              `${report.agreementsCorrected} agreement(s), ${report.chargesCorrected} charge(s) ` +
              `corrected, ${report.chargesUnknown} unknown, ${report.failed} failed, ` +
              `${report.abandonedDrafts} draft(s) no longer chased`,
          );
        }
      }

      // Repricing runs in both jobs: a renewal arranged tonight must be for
      // the fee that is current tonight.
      const { repriced, failed } = await renewals.repriceAgreements(db, vipps, org.id);
      if (repriced || failed) console.log(`${org.slug}: repriced ${repriced}, failed ${failed}`);

      if (arrangeRenewals) {
        const result = await renewals.createDueRenewalCharges(db, vipps, org.id);
        if (result.created || result.failed) {
          console.log(`${org.slug}: renewals created ${result.created}, failed ${result.failed}`);
        }
      }
    } catch (error) {
      console.error(`scheduled job failed for ${org.slug}`, error);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(FORMER_ORG_PAGE_PREFIX)) {
      const moved = new URL(url);
      moved.pathname = `/${JOIN_PAGE_PATH_SEGMENT}/${url.pathname.slice(FORMER_ORG_PAGE_PREFIX.length)}`;
      return Response.redirect(moved.toString(), 301);
    }
    // A query string means the page is answering something about THIS visitor
    // — a failed join attempt, a chosen membership — so it is rendered fresh
    // and never stored: one visitor's message must not become everyone's page.
    if (request.method === "GET" && !url.search && PUBLIC_ORG_PAGE.test(url.pathname)) {
      // Normalized key: no query, no trailing slash — one copy per page, plus
      // the date, because the join page quotes a price that shrinks as the
      // calendar year runs out (specs/concepts/annual-period.md). Without the
      // date a copy made in August could still be quoting August's price in
      // November.
      const today = new Date().toISOString().slice(0, 10);
      const cacheKey = `${url.origin}${url.pathname.replace(/\/+$/, "")}#${today}`;
      const cache = await caches.open(PUBLIC_ORG_PAGE_CACHE);
      const cached = await cache.match(cacheKey);
      if (cached) {
        // Serve stale instantly; refresh in the background for the next visit.
        // The key carries a date fragment, so revalidate against the real URL.
        ctx.waitUntil(renderAndCache(cacheKey, new Request(url.toString()), env, ctx));
        return withCacheStatus(cached, "hit");
      }
      return withCacheStatus(await renderAndCache(cacheKey, request, env, ctx), "miss");
    }
    return handle(request, env, ctx);
  },

  /**
   * Cron Triggers (wrangler.jsonc `triggers.crons`). What keeps memberships
   * running without anybody touching them:
   *
   *   02:00  reconcile — read memberships back from Vipps, then reprice
   *   04:00  renew     — reprice, then arrange next year's payments
   *
   * Reconciliation comes first in the night so the renewal run two hours later
   * is deciding against a corrected record. Both jobs are idempotent, so a
   * missed night costs nothing and a repeated one changes nothing. Every
   * organization is visited; one organization's failure never stops the others.
   */
  async scheduled(controller, _env, ctx) {
    ctx.waitUntil(runScheduledJobs(controller.cron));
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
