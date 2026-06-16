---
name: orchestrate-request
description: Deterministically classify non-trivial repository requests, extract and reconcile requirements from user input and governance sources, select required skills and project-agent routing, define acceptance criteria, and produce a verification matrix before execution. Use for governance, architecture, packaging, runtime, cross-module, high-risk, ambiguous, or agentic-workflow tasks.
---

# Orchestrate Request

Use this skill before executing non-trivial repository work.

## State Machine

Follow these states in order and emit the state output before moving on:

1. `intake`
2. `classification`
3. `requirements-discovery`
4. `requirements-reconciliation`
5. `budget-gate`
6. `routing`
7. `planning`
8. `execution`
9. `quality-review`
10. `contract-guardrail-check`
11. `verification`
12. `repair-loop`
13. `handoff`

Select the workflow path from `rules/agentic-paths.json`. Before file edits, non-trivial commands, or project-agent runs, emit the runtime contract required by that JSON contract.

## Intake

Identify:

- active newest user request;
- requested mutation level: read-only, file edit, command execution, commit, or release;
- named skills;
- explicit request for project agents, subagents, or risk-routed workflow.

## Classification

Assign one or more request types:

- `question`
- `implementation`
- `debug`
- `review`
- `planning`
- `governance`
- `documentation`
- `release`
- `packaging`
- `runtime`
- `agentic-workflow`

Assign risk:

- `low`: bounded single-surface change with obvious tests;
- `medium`: cross-file implementation, packaging, release, or governance documentation;
- `high`: security, routing, sanitization, virtual filesystem, concurrency, watcher behavior, migration, architecture, contract changes, or agentic-workflow governance.

## Requirements Loop

Extract requirements from:

1. user request;
2. `contracts/`;
3. `doc/adr/`;
4. `memory/decisions.md`;
5. `rules/`;
6. `guardrails/`.

Resolve conflicts using that order. If a conflict cannot be resolved by source order, stop and report the blocker.

Exit only when every requirement has:

- source;
- normalized statement;
- acceptance criterion;
- verification method.

## Budget Gate

Use `$resource-budget-gate` after requirements reconciliation and before routing. Emit a `Budget Envelope` covering:

- task class;
- context budget;
- max concurrent runs;
- max write agents;
- max read agents;
- execution-duration budget;
- provider model-tier and run-count budget;
- approval boundary for budget expansion;
- runtime budget checks;
- budget handoff report.

Execution may not begin until the envelope fits [rules/resource-budgets.md](../../../rules/resource-budgets.md).

## Routing

Select skills and agents deterministically:

- apply every `rules/agentic-paths.json` escalation rule;
- choose the minimum allowed path, using the highest rank when multiple paths match;
- use `high-change` when no path matches;
- named skill: required;
- clearly applicable skill: required;
- `low`: coordinating agent or `implementer`;
- `medium`: explicit plan before edits;
- `high`: `planner` before execution and `senior-implementer` for write work when project agents are invoked;
- requested review: `reviewer`;
- material final verification: `verifier`.

Planner-led work must stop after the plan until the user approves that plan.

## Output Template

```text
Task Classification:
Risk:
Required Skills:
Required Agents:
Source Documents:
Requirements:
Budget Envelope:
Acceptance Criteria:
Execution Steps:
Verification Matrix:
Repair Triggers:
Handoff Gate:
```

## Repair Triggers

Require repair when a test, governance validation, contract check, guardrail check, reviewer finding, verifier finding, or acceptance criterion fails.
