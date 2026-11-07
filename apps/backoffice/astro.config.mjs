// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

// One Cloudflare Worker for everything server-side: the Astro-rendered UI/API
// plus the non-HTTP handlers (scheduled, queue) exported from src/worker.ts —
// see wrangler.jsonc `main` and docs/architecture/overview.md.
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  build: {
    // The public pages are served on the apex, where only their own paths are
    // routed to this Worker: /_astro/* there belongs to the marketing Worker
    // and 404s. A stylesheet over Astro's 4 kB inline limit would become such a
    // link and the page would lose its styles, so styles always ride in the
    // page (.claude/skills/verify-public-routes/apex-routes.mjs checks this).
    inlineStylesheets: "always",
  },
  vite: {
    // @stottemedlem/ui ships .astro/.css source (no build step) — keep it in
    // the bundle so Astro compiles it instead of externalizing it for SSR.
    ssr: {
      noExternal: ["@stottemedlem/ui", "@fontsource-variable/fraunces"],
    },
    server: {
      // Payment testing has to reach this dev server from the outside — Vipps
      // opens the redirect, the member's management page and the webhook
      // receiver over a public HTTPS tunnel. Vite otherwise answers any
      // unfamiliar Host with "Blocked request", which looks exactly like a
      // broken tunnel. Dev-only; deployed Workers never see this config.
      allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io"],
    },
  },
});
