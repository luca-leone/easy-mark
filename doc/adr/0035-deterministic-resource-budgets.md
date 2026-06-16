# ADR-0035: Deterministic Resource Budgets

## Status

Accepted - 2026-06-16

## Context

The repository has deterministic workflow states, explicit project-agent routing, native Codex context telemetry, and independent quality gates. It does not yet define a single mandatory budget contract for cost, latency, context, concurrency, execution duration, and provider usage.

Without a budget contract, non-trivial agentic work can expand through additional tool output, extra subagent runs, long verification loops, or higher-cost provider choices without a deterministic stop condition. The user requires a structured workflow where budget violations are detected, repaired, or escalated explicitly.

## Decision

Introduce `rules/resource-budgets.md` as the canonical resource-budget policy for repository agentic work. Every non-trivial task must declare a `Budget Envelope` before execution, including task class, context state, maximum concurrent runs, write/read agent limits, execution-duration budget, provider budget, approval boundary, runtime checks, and handoff reporting.

Add a `budget-gate` state to the deterministic workflow before routing and planning. The gate must run after requirements are reconciled and before execution begins. During execution, a runtime budget loop checks context, concurrency, duration, and provider budget at phase boundaries and after unusually large tool output.

Represent provider costs as deterministic model-tier and run-count budgets by default. Monetary cost claims require an authoritative billing or provider-pricing source for the exact provider, model, and date.

Add `$resource-budget-gate` as the repository skill for constructing and checking budget envelopes. Governance validation must verify that the policy, workflow, skill, and agent definitions remain wired together.

## Consequences

- Cost, latency, token, concurrency, and execution constraints become explicit task inputs instead of conversational preferences.
- Non-trivial work has a deterministic stop condition when a budget would be exceeded.
- Provider usage remains auditable without inventing monetary estimates.
- Agent roles must account for budget envelopes in planning, implementation, review, and verification.
- Governance validation now covers resource-budget wiring.

## Alternatives Considered

- Keep budget management inside general workflow prose: rejected because it is too easy to skip and cannot be validated directly.
- Track exact token counts manually: rejected because Codex native context telemetry is the only authoritative context-capacity source available to this repository.
- Use fixed monetary limits for every provider call: rejected because exact prices and billing context are external, provider-specific, and temporally unstable unless supplied by an authoritative source.
