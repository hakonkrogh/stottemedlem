# The spec harness — spec-driven development

This document describes the **mandatory** process that keeps the spec layer
(`specs/`) in sync with the product. It is part of the spec layer itself so that
the process is as inspectable as the product it governs.

## Why this exists

Agents and people change this product over time. Code records *how* it currently
works; it does not record *what it is supposed to do* or *why*. Without a durable
intent layer, that knowledge is re-derived (often wrongly) on every change. The
spec layer is the always-available, LLM-readable source of truth for intent, and
this harness guarantees it never silently drifts from the code.

## The three layers

| Layer | Directory | Answers | One file per… |
|-------|-----------|---------|---------------|
| **Problem** | `specs/problems/` | *Why* — the user/business problem we solve | problem |
| **Use case** | `specs/use-cases/` | *What* the product does to solve it | user-facing goal |
| **Concept** | `specs/concepts/` | Shared vocabulary both layers refer to | domain concept |

Every file links to the others it relates to. `specs/INDEX.md` is the high-level
overview and the registry of all three layers.

**Specs describe behaviour and intent, never implementation.** No file paths,
class names, or algorithms — that is the code's job and it would only rot here.

## The loop (run on every code change)

1. **Read first.** Before editing code under `apps/` or `packages/`, open
   `specs/INDEX.md` and the spec(s) covering the area. The change must match
   intended behaviour. If nothing covers it, writing that spec is step one.
2. **Identify impact.** Decide which problems / use cases / concepts the change
   creates, changes, or retires.
3. **Reconcile.** Add or edit those spec files (use `specs/_TEMPLATE.md`) and
   update the registry tables in `specs/INDEX.md`.
4. **No-impact is valid.** Pure refactors, build/config, and dependency bumps
   change no behaviour — state that explicitly; do not invent a spec.

## Enforcement

A `Stop` hook (`.claude/hooks/spec-sync-stop.sh`) inspects the session at its
end. If code under `apps/` or `packages/` was edited but no file under `specs/`
was touched, it blocks once and requires you to reconcile (or to confirm the
change had no product-behaviour impact). It mirrors the `close-gaps` hook and
guards against silent drift — it is a backstop, not a substitute for running the
loop as you work.

## Writing good specs

- Title each spec as the goal or problem in plain language.
- Lead with intent; keep it implementation-free and testable.
- Cross-link with relative Markdown links so any agent can traverse the graph.
- Prefer editing an existing spec over adding a near-duplicate.
- When behaviour is removed, mark the spec **Retired** with a one-line reason
  rather than deleting it, so history of intent survives.
