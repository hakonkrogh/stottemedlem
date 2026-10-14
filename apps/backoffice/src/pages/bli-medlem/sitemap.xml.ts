import { joinPagePath } from "@stottemedlem/core";
import { listSlugsOfOrganizationsWithMembers } from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";
import { shareableOrigin } from "../../lib/joinLinks";

/**
 * The join pages search engines are told about, so someone who searches for
 * støttemedlem and an organization's name finds that organization's page
 * (specs/use-cases/sign-up-for-early-access.md). The front page's sitemap
 * index points here.
 *
 * Only organizations with at least one supporting member are listed. A slug
 * never holds a dot, so this address can never be an organization's page.
 */
export const GET: APIRoute = async () => {
  const origin = shareableOrigin();
  const slugs = await listSlugsOfOrganizationsWithMembers(getDb());
  const urls = slugs.map((slug) => `  <url><loc>${origin}${joinPagePath(slug)}</loc></url>`);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Crawlers ask rarely, and a new organization may wait an hour.
      "cache-control": "public, max-age=3600",
    },
  });
};
