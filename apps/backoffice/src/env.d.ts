/// <reference types="astro/client" />

// The wrangler-generated worker-configuration.d.ts (which defines the global
// `Env`) is excluded from the app tsconfig, because its Workers runtime globals
// clash with the DOM lib Astro needs (see tsconfig.json). The Cloudflare adapter
// types `Astro.locals.runtime.env` as the global `Env`, so we declare the subset
// app code — middleware and pages — actually reads here. worker.ts type-checks
// against the full generated Env via tsconfig.worker.json instead. Extend this
// as more bindings (D1, KV) get consumed by app code in later scaffolding steps.
interface Env {
  /** D1 system-of-record database (schema/queries in @stottemedlem/db). */
  DB: import("@cloudflare/workers-types").D1Database;
  /** WorkOS API key (secret; from .dev.vars locally, `wrangler secret` in cloud). */
  WORKOS_API_KEY: string;
  /** WorkOS AuthKit client id (per environment). */
  WORKOS_CLIENT_ID: string;
  /** 32+ char password sealing the session cookie (secret). */
  WORKOS_COOKIE_PASSWORD: string;
  /** Registered AuthKit redirect URI for this environment's /callback. */
  WORKOS_REDIRECT_URI: string;
  /**
   * Vipps environment: https://apitest.vipps.no everywhere except production.
   * The only per-environment Vipps config — each org brings its own sales-unit
   * keys (stored in WorkOS Vault; see src/lib/vippsKeys.ts).
   */
  VIPPS_API_BASE_URL: string;
  /**
   * The public HTTPS origin Vipps must reach (redirect, the member's own
   * management page, webhook deliveries). Normally derived from the incoming
   * request; set only when the outside address differs from the one the Worker
   * sees — e.g. a local tunnel in front of `astro dev`.
   */
  PUBLIC_ORIGIN?: string;
  /**
   * The origin the shareable public addresses (dashboard join links, QR
   * payloads) live on. Set on staging so its links point at staging's own
   * join pages; unset means the canonical støttemedlem.no origin
   * (src/lib/joinLinks.ts).
   */
  JOIN_PAGE_ORIGIN?: string;
  /**
   * Which period scheme this environment counts memberships in (see
   * src/lib/periods.ts): unset/"calendar-year" in production, "iso-week" on
   * staging — the accelerated calendar where a week is treated as a year.
   */
  PERIOD_SCHEME?: string;
  /**
   * Resend API key (secret). Absent = member notices are logged, not sent, and
   * nothing is recorded as having told anyone (see src/lib/email.ts).
   */
  RESEND_API_KEY?: string;
  /**
   * Sentry DSN, set as a secret (`wrangler secret put SENTRY_DSN`) on
   * production ONLY — kept out of wrangler.jsonc `vars` so local dev can
   * never inherit it and report a developer's machine into production
   * alerting. Absent means errors are logged, not reported
   * (specs/concepts/operational-alerting.md).
   */
  SENTRY_DSN?: string;
  /**
   * The environment name stamped on every Sentry event ("production" /
   * "staging"), so the operator can filter one environment's noise from the
   * other's. A wrangler var per env; unset (local dev) reports as
   * "development" — moot, since local dev never has the DSN.
   */
  SENTRY_ENVIRONMENT?: string;
  /**
   * The address member notices are sent from. Must be on a domain verified
   * with the provider, so it is always ours — the organization's own address
   * is the reply-to instead (specs/concepts/member-notice.md).
   */
  EMAIL_FROM_ADDRESS: string;
  /**
   * Optional local-development keys for ONE shared Vipps TEST sales unit
   * (.dev.vars), used only when an org has no keys of its own in Vault and
   * only against apitest.vipps.no — see src/lib/vipps.ts.
   */
  VIPPS_CLIENT_ID?: string;
  VIPPS_CLIENT_SECRET?: string;
  VIPPS_SUBSCRIPTION_KEY?: string;
  VIPPS_MSN?: string;
  /** Local-development webhook secret for that same shared TEST sales unit. */
  VIPPS_WEBHOOK_SECRET?: string;
  /** KV cache for Vipps access tokens (1 h test / 24 h prod lifetime). */
  VIPPS_TOKENS: import("@cloudflare/workers-types").KVNamespace;
  /**
   * Queue for organization messages to supporting members: the compose page
   * enqueues one job per message, the consumer in src/worker.ts sends it
   * (specs/concepts/org-message.md).
   */
  ORG_MESSAGES: import("@cloudflare/workers-types").Queue;
  /** R2 bucket for uploaded org media (logo/banner images). */
  MEDIA: import("@cloudflare/workers-types").R2Bucket;
}

// Astro v6+ removed `Astro.locals.runtime.env`; the Cloudflare adapter now
// surfaces bindings/secrets through the `cloudflare:workers` virtual module. The
// generated declaration lives in worker-configuration.d.ts (excluded here), so
// declare the `env` surface app code imports. worker.ts sees the full one.
declare module "cloudflare:workers" {
  export const env: Env;
}

declare namespace App {
  interface Locals {
    /** Populated by src/middleware.ts on every request that carries a valid session. */
    session?: import("./lib/workos").SessionInfo;
  }
}
