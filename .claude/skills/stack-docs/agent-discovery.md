# Agent discovery and crawling (researched 2026-10-15, web only, not tried in repo)

What the site already has: `apps/marketing/public/robots.txt` (allow all + `Sitemap:`)
and a sitemap index (`sitemap-forside.xml` + backoffice `/bli-medlem/sitemap.xml`).

| Thing | Status (Oct 2026) | Verdict for us |
|---|---|---|
| robots.txt + sitemap | Real standards, read by every crawler | Done |
| `agents.txt` | Several unrelated proposals share the name; one is an individual IETF draft (`draft-car-agents-txt-wellknown`, expires 2026-12-14), no working group, no known readers | Skip |
| `llms.txt` | Popular proposal (~10% of sites), weak evidence AI assistants read it; dev tools do | Optional, only if kept accurate |
| Content Signals (`Content-Signal: search=yes, ai-input=yes, ai-train=no` line in robots.txt) | Cloudflare, Sep 2025, CC0; honoured on Cloudflare's network; IETF aipref work ongoing | Cheap, recommended |
| Cloudflare Markdown for Agents (`Accept: text/markdown` → edge converts HTML) | Live, zone setting, Pro plan or higher | Dashboard setting, not code |
| MCP / A2A / WebMCP / ARD | For sites that expose tools or agents | Not relevant yet |

Sources (re-fetch before relying on a status, these move fast):
- Standards matrix: https://agentexperience.tech/insights/agent-web-standards/
- llms.txt evidence: https://agentexperience.tech/insights/state-of-llms-txt/
- Content Signals draft: https://www.ietf.org/archive/id/draft-romm-aipref-contentsignals-00.html
- Markdown for Agents: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents
- agents.txt draft repo: https://github.com/kaylacar/agents-txt
