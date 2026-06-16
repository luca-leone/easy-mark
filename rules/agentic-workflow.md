# Deterministic Agentic Workflow

## Scope

This file is the canonical operating policy for non-trivial repository work. `AGENTS.md` bootstraps the agent and points here; [ADR-0033](../doc/adr/0033-deterministic-agentic-workflow.md) records the accepted architectural decision.

Select the workflow path from the deterministic contract in [agentic-paths.json](agentic-paths.json). Any task that changes files, affects behavior, touches governance, spans multiple modules, invokes a skill, or uses project agents is non-trivial.

## State Machine

Non-trivial work preserves this state order for every applicable state:

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

Every state produces output that can be inspected. Before file edits, non-trivial commands, or project-agent runs, emit and validate the runtime contract required by `rules/agentic-paths.json`; `PreToolUse` hooks enforce that contract for governed tools.

## Intake And Classification Loop

For non-trivial work, first classify the request as one or more of: `question`, `implementation`, `debug`, `review`, `planning`, `governance`, `documentation`, `release`, `packaging`, `runtime`, or `agentic-workflow`.

Record risk as:

- `low`: bounded single-surface changes with obvious tests;
- `medium`: cross-file implementation, packaging, release, or governance documentation;
- `high`: security, routing, sanitization, virtual filesystem, concurrency, watcher behavior, migration, architectural decisions, contract changes, or agentic-workflow governance.

Exit criteria:

- request type is named;
- risk level is named;
- newest user instruction is identified as the active objective;
- required skills and project agents are identified before execution begins.

## Requirements Discovery And Reconciliation Loop

Before implementation, derive requirements from the user request and from source-of-truth documents in order: `contracts/`, `doc/adr/`, `memory/decisions.md`, `rules/`, then `guardrails/`. Compare those requirements against the files and tests likely to be affected.

Loop until:

- explicit user requirements are listed;
- implicit contract, ADR, rule, and guardrail requirements are listed;
- conflicts are resolved by the source-of-truth order or reported as blocking;
- acceptance criteria are written for every required behavioral or governance outcome;
- each acceptance criterion has a planned verification command or inspection.

## Budget Gate And Runtime Budget Loop

Use `$resource-budget-gate` for non-trivial work before routing, planning, or execution. Build a `Budget Envelope` from [rules/resource-budgets.md](resource-budgets.md) after requirements are reconciled and before project agents, skills, or long-running commands are selected.

During execution, repeat the runtime budget loop at phase boundaries and after unusually large tool output. Continue only when the next phase fits the declared envelope. Stop and request explicit approval before exceeding context, concurrency, duration, or provider budgets.

Exit criteria:

- the `Budget Envelope` is populated;
- budget class is consistent with risk and source-of-truth requirements;
- budget caps do not exceed `.codex/config.toml`;
- every planned project-agent or provider run fits the provider model-tier and run-count budget;
- budget repair triggers are known before execution begins.

## Routing Loop

Use `$orchestrate-request` for workflow intake and routing. Apply `rules/agentic-paths.json`: collect task facts, apply escalation rules, choose the minimum allowed path, prefer the highest rank when multiple paths match, and use `high-change` when none match.

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

## Planning And Execution Loop

Every non-trivial plan maps steps to acceptance criteria and verification. During execution, make the smallest coherent change, keep unrelated worktree changes intact, and update contracts, ADRs, and `memory/decisions.md` whenever the required workflow says they are material.

Loop until:

- all planned edits are complete;
- deviations from the plan are explained and still satisfy acceptance criteria;
- no known required documentation update is missing.

## Quality, Contract, And Guardrail Loop

Use `$quality-gate` before final handoff for non-trivial changes. Review the diff against contracts, ADRs, rules, guardrails, and tests.

Loop until:

- every acceptance criterion has passed verification or is explicitly blocked;
- `npm test` has passed unless the task is read-only or the user explicitly limits verification;
- contract changes are present for observable behavior changes;
- ADR and memory entries are present for architectural or material decisions;
- guardrails are satisfied.

## Repair Loop

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

## Handoff Loop

Before the final response, confirm:

- newest user request is answered;
- changed files are known;
- tests and validation outcomes are known;
- required contracts, ADRs, memory entries, and skills are synchronized;
- budget handoff report is complete;
- agentic compliance report covers selected path, escalation rules, hook enforcement, verification, and violations;
- verified task changes are committed with `$auto-commit` or `npm run task:commit` unless the user explicitly disables automatic committing;
- long-running processes are closed unless intentionally handed off with a URL;
- residual risks or skipped checks are explicitly stated.

## Execution Template

Use these fields: `Task Classification`, `Risk`, `Required Skills`, `Required Agents`, `Source Documents`, `Requirements`, `Budget Envelope`, `Acceptance Criteria`, `Execution Steps`, `Verification Matrix`, `Repair Triggers`, and `Final Handoff Checklist`.
