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
  /** Vipps environment: https://apitest.vipps.no everywhere except production. */
  VIPPS_API_BASE_URL: string;
  /** Vipps sales-unit client id (per environment). */
  VIPPS_CLIENT_ID: string;
  /** Vipps sales-unit client secret (secret; .dev.vars / `wrangler secret`). */
  VIPPS_CLIENT_SECRET: string;
  /** Ocp-Apim-Subscription-Key for the sales unit (secret). */
  VIPPS_SUBSCRIPTION_KEY: string;
  /** Merchant Serial Number of the sales unit carrying Faste betalinger. */
  VIPPS_MSN: string;
  /** KV cache for Vipps access tokens (1 h test / 24 h prod lifetime). */
  VIPPS_TOKENS: import("@cloudflare/workers-types").KVNamespace;
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
