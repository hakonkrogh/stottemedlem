# stottemedlem — agent instructions

This repository is **spec-driven**. The product's intended behaviour — the
problems it solves, what it should do, and the concepts it is built from — lives
in [`specs/`](specs/INDEX.md), **not** in code comments or commit messages. The
code is the implementation; `specs/` is the source of truth for *intent*.

## Start here, every session

**Read [`specs/INDEX.md`](specs/INDEX.md) before changing product behaviour.**
It is the high-level map and links to every problem, use case, and concept.

## The spec harness — MANDATORY

Every change to product behaviour MUST be reconciled with the spec layer in the
**same** unit of work. This is not optional and is enforced by a `Stop` hook
(`.claude/hooks/spec-sync-stop.sh`): if you edit code under `apps/` or
`packages/` and have not reconciled `specs/`, the session is blocked until you do.

The loop, every time you touch code:

1. **Before** writing code, read the relevant spec(s) in `specs/` so the change
   matches intended behaviour. If no spec covers it, that gap is the first thing
   to fix.
2. **While** changing behaviour, decide which specs are affected: a problem
   (`specs/problems/`), a use case (`specs/use-cases/`), and/or a concept
   (`specs/concepts/`).
3. **After**, update or add those spec files and register them in
   `specs/INDEX.md`. Document *what the product does and why* — never *how it is
   implemented* (that is the code's job).

If a code change genuinely has **no** product-behaviour impact (pure refactor,
build config, dependency bump), note that explicitly when the hook prompts you —
that is a valid outcome, not a bypass.

The full process is documented in [`specs/process.md`](specs/process.md).

## Other conventions

- Use `ast-grep` for structural code search.
- TypeScript: never use the `any` type.
- See [`README.md`](README.md) for the monorepo layout, commands, and toolchain.
