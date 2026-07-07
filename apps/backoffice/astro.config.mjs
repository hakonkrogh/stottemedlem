// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

// One Cloudflare Worker for everything server-side: the Astro-rendered UI/API
// plus the non-HTTP handlers (scheduled, queue) exported from src/worker.ts —
// see wrangler.jsonc `main` and docs/architecture/overview.md.
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
});
