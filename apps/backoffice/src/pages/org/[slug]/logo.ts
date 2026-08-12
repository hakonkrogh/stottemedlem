import { env } from "cloudflare:workers";
import { getOrganizationBySlug } from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../../lib/db";
import { serveOrgImage } from "../../../lib/orgImages";

// The organization's uploaded logo, shown on the public landing page. Public
// (under /org/*, see src/middleware.ts); 404 when the org has none.
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const org = await getOrganizationBySlug(getDb(), slug);
  return serveOrgImage(env.MEDIA, org?.logoKey ?? null);
};
