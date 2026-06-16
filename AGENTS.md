# Agent Operating Guide

## Purpose

This repository contains an OS-agnostic Node.js application that converts Markdown from an arbitrary content directory into sanitized HTML fragments held only in `mem-fs`, serves them through a single-page application, and reloads browsers when source files change.

## Source of Truth

Resolve documentation conflicts in this order:

1. `contracts/`
2. `doc/adr/`
3. `memory/decisions.md`
4. `rules/`
5. `guardrails/`

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

## Policy Index

- Deterministic Agentic Workflow: follow [ADR-0033](doc/adr/0033-deterministic-agentic-workflow.md), [rules/agentic-workflow.md](rules/agentic-workflow.md), `$orchestrate-request`, and `$quality-gate`.
- Resource budgets for non-trivial work: follow [ADR-0035](doc/adr/0035-deterministic-resource-budgets.md), [rules/resource-budgets.md](rules/resource-budgets.md), and `$resource-budget-gate`.
- Markdown governance: follow [rules/markdown-governance.md](rules/markdown-governance.md) and `rules/markdown-governance.json`.
- Engineering, quality, documentation, context, and multi-agent rules: [rules/project-rules.md](rules/project-rules.md).
- Repository layout and Codex surface separation: [rules/workspace-layout.md](rules/workspace-layout.md).
- Command reference: [rules/command-reference.md](rules/command-reference.md).
- Release and package publishing: [rules/release-process.md](rules/release-process.md).
- Non-negotiable invariants: [guardrails/non-negotiables.md](guardrails/non-negotiables.md).
- Observable product behavior: [contracts/application-contract.md](contracts/application-contract.md).
