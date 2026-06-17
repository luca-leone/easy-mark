# Markdown Governance

## Contract

[`markdown-governance.json`](../contracts/governance/markdown-governance.json) is the executable contract for governed Markdown files. The Markdown rule explains the contract but does not override it.

## Scope

Governed Markdown includes `AGENTS.md` and `.md` files under `.agents/`, `contracts/`, `doc/`, `evaluation/`, `guardrails/`, `memory/`, `reports/`, and `rules/`.

## Requirements

- Each governed Markdown file must stay at or below the contract line limit.
- Governed Markdown must not use the discretionary modal words listed in `markdown.banned-modals`.
- Governed Markdown obligations must use `must`.
- `rules/project-rules.md` must link to this rule instead of duplicating the contract.

## Hooks

`PreToolUse` and `PostToolUse` Markdown governance hooks must monitor edits to governed Markdown files. Hook violations must trigger `repair mode` before any new workflow phase begins.

## Repair

`script/repair-markdown-governance.mjs` must only apply deterministic mechanical fixes. It must not rewrite obligation meaning; banned modal wording requires explicit text repair.
