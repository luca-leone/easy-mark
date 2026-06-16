---
name: quality-gate
description: Deterministically review non-trivial repository changes before handoff, checking diffs against acceptance criteria, contracts, ADRs, rules, guardrails, tests, documentation duties, and repair-loop triggers. Use after implementation, before final responses, after reviewer/verifier findings, or whenever verification, governance, or output quality must be gated.
---

# Quality Gate

Use this skill before final handoff for non-trivial repository changes and after any failed verification.

## Inputs

Collect:

- newest user request;
- accepted plan or acceptance criteria;
- changed files from `git status --short`;
- staged and unstaged diffs relevant to the task;
- verification commands already run;
- reviewer or verifier findings, when present.

## Review Loop

Check each item deterministically:

1. Every acceptance criterion is satisfied.
2. Every changed file belongs to the task scope or is explicitly called out.
3. Observable behavior changes are reflected in `contracts/application-contract.md`.
4. Architectural changes have an ADR.
5. Material decisions are appended to `memory/decisions.md`.
6. Guardrails remain satisfied.
7. Tests cover fixed defects and changed behavior.
8. Required commands have passed, including `npm test` for implementation changes.
9. Long-running processes are stopped or intentionally handed off.
10. Final response states skipped checks and residual risks.

## Contract And Guardrail Check

Read the relevant contract, ADR, rule, and guardrail sections. Treat a mismatch between implementation and contract as a defect unless the task explicitly revises the contract and decision record.

## Repair Loop

When any check fails:

1. Classify the failure.
2. Identify the root cause.
3. Apply the smallest coherent repair.
4. Re-run the failed verification.
5. Re-run dependent verification.
6. Repeat until pass or genuine blocker.

Report a blocker only after the same blocking condition repeats for three consecutive attempts and no meaningful progress remains possible without user or external input.

## Handoff Gate

Final response may proceed only when:

- task objective is satisfied or blocked;
- verification state is known;
- governance updates are complete;
- no known contract or guardrail violation remains;
- changed files and risks can be summarized accurately.
