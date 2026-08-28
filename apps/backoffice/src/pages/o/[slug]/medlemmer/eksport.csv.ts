import { csvDocument, periodLabel } from "@stottemedlem/core";
import { listOrganizationMembers } from "@stottemedlem/db";
import type { APIRoute } from "astro";
import { getDb } from "../../../../lib/db";
import { requireOrgAccess } from "../../../../lib/orgAccess";
import { periods } from "../../../../lib/periods";

// The member list as a spreadsheet (specs/use-cases/export-member-list.md).
// The register is the organization's own data: whatever tool they manage
// members in, they can take the list with them. Same rows and same derived
// status as the member list screen — the export never knows more or less than
// the page does.
export const GET: APIRoute = async ({ locals, params }) => {
  const org = await requireOrgAccess(locals.session, params.slug);
  if (!org) return new Response("Fant ikke organisasjonen", { status: 404 });

  const currentPeriod = periods.periodFor().year;
  const members = await listOrganizationMembers(getDb(), org.id, currentPeriod);

  const statusLabel = (entry: (typeof members)[number]): string => {
    // Mirrors the list: no completed payment ever is "Ikke betalt", not lapsed.
    if (!entry.latest) return "Ikke betalt";
    return entry.status === "active" ? "Aktiv" : "Utløpt";
  };

  const csv = csvDocument([
    [
      "Navn",
      "E-post",
      "Telefon",
      "Status",
      "Medlemskap",
      "Sist betalte periode",
      "Betalt beløp (kr)",
      "Fornyes automatisk",
      "Registrert",
    ],
    ...members.map((entry) => [
      entry.member.name,
      entry.member.email,
      entry.member.phone,
      statusLabel(entry),
      entry.latest?.tierName ?? null,
      entry.latest ? periodLabel(entry.latest.periodYear) : null,
      entry.latest?.paidNok ?? null,
      entry.renewing ? "Ja" : "Nei",
      entry.member.createdAt.slice(0, 10),
    ]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="medlemmer-${org.slug}-${today}.csv"`,
      // The register changes as people join and pay; a stale copy helps nobody.
      "cache-control": "no-store",
    },
  });
};
