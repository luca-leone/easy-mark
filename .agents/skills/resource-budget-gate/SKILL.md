---
name: resource-budget-gate
description: Build and enforce deterministic Budget Envelopes for non-trivial repository work, covering context thresholds, concurrent runs, execution duration, provider model-tier budgets, approval boundaries, runtime budget loops, and handoff reporting.
---

# Resource Budget Gate

Use this skill before executing non-trivial repository work and whenever execution may exceed the declared budget.

## Inputs

Collect:

- newest user request;
- task classification and risk;
- accepted requirements and acceptance criteria;
- expected skills and project agents;
- expected verification commands;
- current native Codex context state from `context-remaining` or `/status` when available;
- known long-running commands or external provider calls.

## Budget Envelope

Emit this envelope before execution:

```text
Task Class:
Context Budget:
Max Concurrent Runs:
Max Write Agents:
Max Read Agents:
Execution Budget:
Provider Budget:
Approval Required Above Budget:
Runtime Budget Checks:
Budget Handoff Report:
```

Use exactly one primary `Task Class`: `low`, `medium`, `high`, or `release`. When multiple classes apply, choose the highest class in this order: `release`, `high`, `medium`, `low`.

## Default Caps

Apply these defaults unless the user explicitly approves a stricter or larger envelope:

| Task Class | Max Concurrent Runs | Max Write Agents | Max Read Agents |
| --- | ---: | ---: | ---: |
| `low` | 1 | 1 | 0 |
| `medium` | 2 | 1 | 1 |
| `high` | 3 | 1 | 2 |
| `release` | 2 | 1 | 1 |

Never exceed `.codex/config.toml` `max_threads = 4` and `max_depth = 1`.

## Context Gate

Use only native Codex context telemetry:

- `green`: more than `50%`;
- `yellow`: `30%` through `50%`;
- `red`: `15%` through less than `30%`;
- `stop`: less than `15%`.

Never invent exact token counts. At `red`, complete only the current atomic operation and prepare a compact handoff. At `stop`, stop after the current atomic operation and recommend `/compact`.

## Provider Gate

Provider budgets are model-tier and run-count budgets:

- `low`: coordinating agent only;
- `medium`: one bounded implementer or one read-only reviewer/verifier;
- `high`: one planner plus one senior implementer, reviewer, or verifier as routed;
- `release`: coordinating agent plus one verifier for remote or package-distribution work.

Do not claim monetary cost unless an authoritative billing or provider-pricing source is available for the exact provider, model, and date.

## Runtime Budget Loop

At phase boundaries and after unusually large tool output:

1. compare actual work with the envelope;
2. check context state before starting a new major phase;
3. check active concurrent runs;
4. check that the next command or agent run fits the phase budget;
5. stop and request approval before exceeding the envelope.

## Repair Triggers

Require repair when:

- context reaches `red` or `stop` before a new major phase;
- concurrent runs exceed the envelope;
- one writer would overlap another writer's file scope;
- a command or agent run exceeds its execution-duration budget;
- provider usage would exceed the declared model-tier or run-count budget;
- paid network-backed provider usage is needed without explicit approval.

Repair by reducing scope, using a lower-cost route, asking for approval, or reporting a blocker after the same budget condition repeats for three consecutive attempts.

## Handoff

Final handoff must state:

- declared budget class;
- skills and project agents actually used;
- verification commands run;
- budget violations and repairs;
- approvals requested;
- manual push, publish, or paid provider actions still reserved to the user.
