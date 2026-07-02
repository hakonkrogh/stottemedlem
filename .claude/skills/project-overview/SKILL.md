---
name: project-overview
description: Orientation for the stottemedlem repo — what it is, where things live, how to run/build/test, and the mandatory spec harness. Read at the start of any task in this project.
---
# stottemedlem — project overview

**Product:** støttemedlem ("supporting member") — a B2C SaaS that lets small
organizations (marching bands, choirs, community groups) collect an annual
supporting-member fee and curate their list of supporting members. Nothing more.

A pnpm + Turborepo TypeScript (ESM) monorepo. **Spec-driven:** product intent
lives in `specs/`, kept in sync with code by a mandatory `Stop`-hook harness.

## Where things live
- `apps/web/` — Next.js 16 App Router app (the product surface).
- `packages/core/` — `@stottemedlem/core`, shared domain types/logic.
- `specs/` — the product intent layer (problems → use cases → concepts). Entry: `specs/INDEX.md`.
- `.claude/hooks/` — Stop hooks: `spec-sync-stop.sh` (spec harness) + `close-gaps-stop.sh`.
- `CLAUDE.md` — auto-loaded agent instructions; the canonical "start here".

## Run / build / test
- `pnpm install` · `pnpm dev` · `pnpm build` · `pnpm test` (vitest) · `pnpm typecheck` · `pnpm lint` (Biome) · `pnpm format`.
- Single package: `pnpm turbo run <task> --filter=@stottemedlem/<name>`.
- Conventions: ESM everywhere; never use the `any` type; use `ast-grep` for structural search.

**Vipps research gotcha:** for ground truth on Vipps MobilePay API capabilities, fetch
the OpenAPI specs (`developer.vippsmobilepay.com/redocusaurus/<api>-swagger-id.yaml`,
rendered at `/api/<name>/`) — marketing and help-center pages omit hard limits (e.g.
the Donations `Schedule.interval` enum is `[MONTHLY]` only, found nowhere in prose).

## Index
| doc | covers |
|-----|--------|
| (canonical) `CLAUDE.md` | the mandatory spec harness + start-here loop |
| (canonical) `specs/process.md` | the spec-driven loop in full + enforcement |
| (canonical) `specs/INDEX.md` | high-level product map / spec registry |
| (canonical) `README.md` | monorepo layout, commands, toolchain |
| stop-hooks.md | how the two Stop hooks compose + how to test a hook locally |
| (canonical) `docs/research/vipps-recurring-payments.md` | verified Vipps Recurring API v3 research (yearly agreements, tiers via LEGACY pricing PATCH, 10 webhook events, local DB as system of record, NO onboarding/retention rules); Appendix A rules out Vipps Donasjoner definitively (monthly-only enum, no API amount control) — read before any payment work; not yet fed into `specs/` |
