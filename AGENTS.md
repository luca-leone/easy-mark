# Agent Operating Guide

## Purpose

This repository contains an OS-agnostic Node.js application that converts `src/**/*.md` into sanitized HTML fragments held only in `mem-fs`, serves them through a single-page application, and reloads browsers when source files change.

## Source of Truth

Resolve documentation conflicts in this order:

1. `contracts/` defines current externally observable behavior.
2. `doc/adr/` records accepted architectural decisions and their rationale.
3. `memory/decisions.md` provides an append-only chronological decision index.
4. `rules/` defines repository working conventions.
5. `guardrails/` defines invariants that implementations must not violate.

If implementation and contract disagree, treat the discrepancy as a defect. Update implementation or explicitly revise the contract and associated decision records.

## Required Workflow

1. Read this file and the governance documents relevant to the change.
2. Inspect the existing implementation and tests before editing.
3. Make the smallest coherent change that fixes the root cause.
4. Update `contracts/application-contract.md` for observable behavior changes.
5. Append a dated entry to `memory/decisions.md` for material decisions.
6. Create or supersede an ADR for architectural changes.
7. Run `npm test` before handoff.

Never rewrite or delete existing entries in `memory/decisions.md`. Record corrections and supersessions as new entries.

## Repository Map

- `core/server/`: server entry point, conversion, virtual filesystem, navigation, and HTTP behavior.
- `core/web/`: bundled app shell and stylesheet templates, browser runtime, and default static assets.
- `src/`: user-authored Markdown, public project metadata, assets, and optional app shell and stylesheet overrides.
- `test/`: Node unit and integration tests.
- `rules/`: repository engineering rules.
- `contracts/`: normative application behavior.
- `guardrails/`: non-negotiable system invariants.
- `script/`: repository validation and maintenance scripts.
- `hooks/`: versioned Git hooks installed through `npm run hooks:install`.
- `evaluation/`: acceptance criteria used for human and automated review.
- `memory/`: concise append-only decision history for agents.
- `doc/adr/`: human-facing MADR architecture decision records.
- `reports/`: documentation for generated reports; generated outputs are ignored.
- `.agents/skills/`: repository-scoped Codex skills, expressed as required `SKILL.md` documents and optional skill metadata.
- `.codex/agents/`: TOML definitions for project-local Codex subagent roles; this is distinct from skill discovery.
- `.codex/`: trusted project-local Codex configuration.

Do not merge `.agents/skills/` into `.codex/agents/`: the directories are separate Codex surfaces with different schemas. Create `hooks/` only when a concrete repository hook is implemented. Store repository skills under `.agents/skills/`, not a root `skills/` directory. Do not add empty placeholder directories.

## Commands

- `npm run start`: build the virtual site, serve it, and watch `src/`.
- `npm run hooks:install`: configure this clone to use the versioned hooks in `hooks/`.
- `npm run commit:validate -- --message "type(scope): description"`: validate a commit message explicitly.
- `npm run validate:governance`: validate governance structure and references.
- `npm test`: validate governance and run all Node tests.
- `npm run test:coverage`: run the Node suite with built-in coverage reporting.
- `npm run check`: run the complete required verification.

## Context Budget

- Treat the TUI `context-remaining` status-line item and `/status` as the only authoritative context-capacity sources.
- For long tasks, invoke `$context-budget-monitor` at phase boundaries, after unusually large tool output, or when remaining context approaches 50%, 30%, or 15%.
- At 30% or less, prepare a compact handoff before starting another major phase.
- At 15% or less, finish only the current atomic operation and recommend `/compact`.
- Never estimate exact token usage from transcript length or hook output.

## Multi-Agent Workflow

- Use project agents only when the user explicitly requests subagents, parallel agents, or the risk-routed workflow; Codex does not spawn subagents implicitly.
- Use `planner` for ambiguous, cross-cutting, or requirements-heavy analysis and `reviewer` for independent review of material changes.
- Route bounded low-risk implementation to `implementer`; route security, routing, sanitization, virtual filesystem, concurrency, watcher, migration, architectural, or cross-module work to `senior-implementer`.
- Use `verifier` after implementation to run deterministic checks independently; it reports failures but does not edit code.
- Keep at most one write-capable agent active on a given file scope. Parallelize read-heavy planning, exploration, review, and verification only when their scopes are independent.
- The coordinating agent owns delegation, resolves conflicting handoffs, runs or confirms final `npm test`, and presents the final result.

## Implementation Constraints

- Use ESM and Node.js standard APIs where practical.
- Keep executable workflow and maintenance logic under `script/` as ESM `.mjs`; governance validation rejects every other file extension there.
- Preserve platform-required declarative formats: skills and guardrails are Markdown, skill metadata is YAML, agent definitions are TOML, and Git hook entry points use Git-required filenames with minimal POSIX wrappers.
- Prefer deterministic algorithms, explicit total ordering, and stable diagnostics whenever multiple valid implementations exist.
- Support Node.js 22 and later as declared by `package.json`; use the Node.js 22 baseline declared by `.nvmrc` for development and verification.
- Keep path handling portable across operating systems.
- Do not commit generated HTML or write converted HTML to disk.
- Keep the resolved virtual `index.html` as the only app shell and stylesheet owner; `src/index.html` and `src/styles.css` may replace the bundled templates.
- Sanitize rendered Markdown HTML.
- Preserve SPA routing, hierarchical navigation, Unicode-safe anchors, and live reload.
- Add regression tests for every fixed defect.
- Use the Conventional Commit policy in `rules/project-rules.md`; local hooks provide feedback but do not replace review or CI enforcement.
