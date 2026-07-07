// @ts-check
import { defineConfig } from "astro/config";

// Fully static — no adapter. Deployed as a Cloudflare Worker that serves
// static assets only (see wrangler.jsonc: `assets` without `main`).
export default defineConfig({});
