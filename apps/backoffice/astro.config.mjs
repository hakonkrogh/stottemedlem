// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

// One Cloudflare Worker for everything server-side: the Astro-rendered UI/API
// plus the non-HTTP handlers (scheduled, queue) exported from src/worker.ts —
// see wrangler.jsonc `main` and docs/architecture/overview.md.
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
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
