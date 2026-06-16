# Agent Operating Guide

## Purpose

This repository contains an OS-agnostic Node.js application that converts Markdown from an arbitrary content directory into sanitized HTML fragments held only in `mem-fs`, serves them through a single-page application, and reloads browsers when source files change.

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

## Deterministic Agentic Workflow

Non-trivial repository work follows the deterministic state machine accepted in [ADR-0033](doc/adr/0033-deterministic-agentic-workflow.md). The coordinating agent owns state transitions and must preserve this order for every applicable state:

1. `intake`
2. `classification`
3. `requirements-discovery`
4. `requirements-reconciliation`
5. `routing`
6. `planning`
7. `execution`
8. `quality-review`
9. `contract-guardrail-check`
10. `verification`
11. `repair-loop`
12. `handoff`

Trivial requests that can be satisfied by a direct answer or a single read-only command may use the minimal applicable subset. Any task that changes files, affects behavior, touches governance, spans multiple modules, invokes a skill, or uses project agents is non-trivial.

### Intake And Classification Loop

For non-trivial work, first classify the request as one or more of: `question`, `implementation`, `debug`, `review`, `planning`, `governance`, `documentation`, `release`, `packaging`, `runtime`, or `agentic-workflow`. Record the risk level as `low`, `medium`, or `high` using the routing rules below.

Exit criteria:

- request type is named;
- risk level is named;
- newest user instruction is identified as the active objective;
- required skills and project agents are identified before execution begins.

### Requirements Discovery And Reconciliation Loop

Before implementation, derive requirements from the user request and from the source-of-truth documents in order: `contracts/`, `doc/adr/`, `memory/decisions.md`, `rules/`, then `guardrails/`. Compare those requirements against the files and tests likely to be affected.

Loop until:

- explicit user requirements are listed;
- implicit contract, ADR, rule, and guardrail requirements are listed;
- conflicts are resolved by the source-of-truth order or reported as blocking;
- acceptance criteria are written for every required behavioral or governance outcome;
- each acceptance criterion has a planned verification command or inspection.

### Routing Loop

Use `$orchestrate-request` for non-trivial workflow intake and routing. Use named skills whenever the user invokes them, and use clearly applicable repository skills when the task matches their description.

Route deterministically:

- `low`: bounded single-surface changes with obvious tests may remain with the coordinating agent or `implementer`;
- `medium`: cross-file implementation, packaging, release, or governance documentation requires an explicit plan before edits;
- `high`: security, routing, sanitization, virtual filesystem, concurrency, watcher behavior, migration, architectural decisions, contract changes, or agentic-workflow governance requires `planner` before execution and `senior-implementer` for write work when project agents are invoked;
- requested review uses `reviewer`;
- material verification after implementation uses `verifier`.

Planner-led work must follow this sequence: define the plan, get explicit user approval for that plan, then execute. Do not proceed from a planner handoff into implementation until the user has approved the plan.

Exit criteria:

- selected skill set is named;
- selected agent route is named;
- any required user approval has been obtained;
- one writer is assigned for each overlapping file scope.

### Planning And Execution Loop

Every non-trivial plan must map steps to acceptance criteria and verification. During execution, make the smallest coherent change, keep unrelated worktree changes intact, and update contracts, ADRs, and `memory/decisions.md` whenever the required workflow says they are material.

Loop until:

- all planned edits are complete;
- deviations from the plan are explained and still satisfy acceptance criteria;
- no known required documentation update is missing.

### Quality, Contract, And Guardrail Loop

Use `$quality-gate` before final handoff for non-trivial changes. Review the diff against contracts, ADRs, rules, guardrails, and tests.

Loop until:

- every acceptance criterion has passed verification or is explicitly blocked;
- `npm test` has passed unless the task is read-only or the user explicitly limits verification;
- contract changes are present for observable behavior changes;
- ADR and memory entries are present for architectural or material decisions;
- guardrails are satisfied.

### Repair Loop

The repair loop is mandatory when any of these triggers occurs:

- a test, governance validation, or targeted verification fails;
- implementation violates a contract, ADR, rule, or guardrail;
- reviewer or verifier reports a valid finding;
- acceptance criteria are not met;
- output is incomplete, nondeterministic, or inconsistent with the newest user request.

Repair by classifying the failure, fixing the root cause, re-running the failed verification, and re-running dependent checks. Continue until all checks pass or a genuine blocker remains after the same blocking condition repeats for three consecutive attempts.

Exit criteria:

- pass state is restored and documented; or
- blocker is reported with the failed criterion, attempted repairs, and exact user or external input required.

### Handoff Loop

Before the final response, confirm:

- newest user request is answered;
- changed files are known;
- tests and validation outcomes are known;
- required contracts, ADRs, memory entries, and skills are synchronized;
- long-running processes are closed unless intentionally handed off with a URL;
- residual risks or skipped checks are explicitly stated.

## Repository Map

- `core/server/`: server runtime, conversion, virtual filesystem, navigation, and HTTP behavior.
- `core/web/`: bundled app shell and stylesheet templates, browser runtime, and default static assets.
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

- `node bin/easy-mark.mjs serve <content-directory>`: build the virtual site, serve it, and watch the selected content directory.
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
- Planner-led work must follow this sequence: define the plan, get explicit user approval for that plan, then execute. Do not proceed from a planner handoff into implementation until the user has approved the plan.
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
- Keep the resolved virtual `index.html` as the only app shell and stylesheet owner; content directories must not replace package-owned `index.html` or `styles.css`.
- Sanitize rendered Markdown HTML.
- Preserve SPA routing, hierarchical navigation, Unicode-safe anchors, and live reload.
- Add regression tests for every fixed defect.
- Use the Conventional Commit policy in `rules/project-rules.md`; local hooks provide feedback but do not replace review or CI enforcement.
