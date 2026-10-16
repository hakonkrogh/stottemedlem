import {
  BACKOFFICE_ORIGIN,
  CANONICAL_ORIGIN,
  DPA_PATH,
  JOIN_PAGE_PATH_SEGMENT,
  SIGN_UP_URL,
} from "@stottemedlem/core";

/**
 * The site described for AI agents, in the llms.txt format (https://llmstxt.org):
 * what the product is and where its public pages are
 * (specs/concepts/agent-discovery.md). Built from the same addresses the front
 * page links to, so it cannot point somewhere the site does not.
 */

const BODY = `# ❤️ støttemedlem.no

> støttemedlem.no lar enhver organisasjon tilby et støttemedlemskap: folk betaler en årlig kontingent med Vipps for å støtte organisasjonen de bryr seg om. Organisasjonen får et register over støttemedlemmene som oppdaterer seg selv.

Nettstedet er på norsk. Hver organisasjon har én offentlig innmeldingsside på ${CANONICAL_ORIGIN}/${JOIN_PAGE_PATH_SEGMENT}/<organisasjonens-navn>, der hvem som helst kan bli støttemedlem og betale med Vipps uten å logge inn. Organisasjoner oppretter seg selv og styrer medlemskapet fra en egen administrasjonsside, som krever innlogging.

## Sider

- [Forsiden](${CANONICAL_ORIGIN}/): hva produktet gjør, medlemsbeviset og QR-kortet
- [Opprett organisasjon](${SIGN_UP_URL}): der en organisasjon registrerer seg
- [Databehandleravtalen](${BACKOFFICE_ORIGIN}${DPA_PATH}): avtalen mellom organisasjonen og støttemedlem.no

## Organisasjoner

- [Nettstedskart](${CANONICAL_ORIGIN}/sitemap.xml): innmeldingssidene til alle organisasjoner som har støttemedlemmer

## Kontakt

- [hei@støttemedlem.no](mailto:hei@støttemedlem.no)
`;

export function GET(): Response {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
