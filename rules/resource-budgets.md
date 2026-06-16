# Resource Budgets

## Scope

This file defines deterministic cost, latency, token, concurrency, and execution budgets for repository agentic work. [ADR-0035](../doc/adr/0035-deterministic-resource-budgets.md) records the accepted architectural decision.

These budgets govern Codex coordination, project-agent routing, skills, command execution, and final handoff reporting. They do not define product runtime limits for the `easy-mark` CLI.

## Budget Envelope

Every non-trivial task must declare a `Budget Envelope` before execution:

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

The envelope is part of the task contract. Execution must not start until each field is populated.

## Task Classes

Classify work into exactly one primary budget class:

- `low`: bounded single-surface changes or read-only analysis with obvious verification.
- `medium`: cross-file implementation, packaging, release, governance documentation, or deterministic script work.
- `high`: security, routing, sanitization, virtual filesystem, concurrency, watcher behavior, migration, architectural decisions, contract changes, or agentic-workflow governance.
- `release`: version, tag, publish, remote push, or package-distribution work.

When more than one class applies, use the highest class in this order: `release`, `high`, `medium`, `low`.

## Context Budget

Use only Codex native context telemetry as authoritative:

- `green`: more than `50%` context remaining.
- `yellow`: `30%` through `50%` context remaining.
- `red`: `15%` through less than `30%` context remaining.
- `stop`: less than `15%` context remaining.

Apply the existing `$context-budget-monitor` policy at threshold boundaries. Never estimate exact token usage from transcript length, file size, hook output, or command output.

Deterministic actions:

- `green`: proceed with the declared envelope.
- `yellow`: reduce broad reads and avoid repeated large outputs.
- `red`: finish the current atomic operation, prepare a compact handoff, and avoid starting a new major phase.
- `stop`: stop after the current atomic operation and recommend `/compact`.

## Concurrency Budget

Repository concurrency is capped by `.codex/config.toml`:

- total project-agent threads: `max_threads = 4`;
- project-agent depth: `max_depth = 1`;
- write-capable agents on overlapping file scopes: `1`;
- read-only agents must run concurrently only when their scopes are independent and the declared `Max Read Agents` allows it.

Default task caps:

| Task Class | Max Concurrent Runs | Max Write Agents | Max Read Agents |
| --- | ---: | ---: | ---: |
| `low` | 1 | 1 | 0 |
| `medium` | 2 | 1 | 1 |
| `high` | 3 | 1 | 2 |
| `release` | 2 | 1 | 1 |

The coordinator owns final integration and must not delegate that responsibility.

## Execution Duration Budget

Execution budgets are phase budgets, not soft preferences:

| Phase | Default Limit |
| --- | ---: |
| focused file inspection | 10 minutes |
| focused implementation | 30 minutes |
| targeted verification | 10 minutes |
| full `npm test` verification | 10 minutes |
| independent review or verifier run | 20 minutes |
| repair attempt for the same failure class | 15 minutes |

Long-running processes must be intentionally handed off with a URL or stopped before final handoff. A command that exceeds its phase budget is a repair trigger unless the user explicitly approves a larger budget.

## Provider Cost Budget

Provider budgets are deterministic model-tier and run-count budgets. Do not claim monetary cost unless an authoritative billing or provider-pricing source is available for the exact provider, model, and date.

Default provider caps:

| Task Class | Provider Budget |
| --- | --- |
| `low` | coordinating agent only; no project subagent unless explicitly requested |
| `medium` | one bounded implementer or one read-only reviewer/verifier |
| `high` | one planner plus one senior implementer, reviewer, or verifier as routed |
| `release` | coordinating agent plus one verifier for remote or package-distribution work |

Any extra high-reasoning agent run, network-backed paid provider call, paid API call, or expansion beyond the declared provider budget requires explicit user approval before execution.

## Runtime Budget Loop

During execution, repeat this loop at every phase boundary and after unusually large tool output:

1. Compare actual work against the `Budget Envelope`.
2. Confirm context status is not `red` or `stop` before starting a new major phase.
3. Confirm active concurrent runs are within the envelope.
4. Confirm the next command or agent run fits the remaining phase budget.
5. Stop and request approval when the next step would exceed the envelope.

## Budget Repair Loop

Budget violations are repair triggers. Repair deterministically:

1. classify the violation as `context`, `concurrency`, `duration`, or `provider`;
2. stop starting new work in the violating class;
3. reduce scope, switch to a lower-cost verification path, or request approval for a larger envelope;
4. re-run only the checks required to prove the repaired path;
5. report a blocker after the same budget condition repeats for three consecutive attempts.

## Handoff Report

Every non-trivial final handoff must report:

- declared budget class;
- actual project-agent and skill usage;
- verification commands run;
- budget violations, if any;
- whether additional user approval was requested;
- whether push, publish, or paid external provider usage remains manual.
