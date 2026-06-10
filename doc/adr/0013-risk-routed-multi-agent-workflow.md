# ADR-0013: Risk-Routed Multi-Agent Workflow

## Status

Accepted — 2026-06-08

## Context

Large models are valuable for ambiguous requirements, architecture, and review, while smaller models can execute bounded changes and deterministic verification more efficiently. A fixed planner-implementer-tester split is unsafe when implementation reveals complexity that was absent from the plan, and parallel write-heavy agents can create conflicts. Codex subagents also require explicit user invocation rather than implicit spawning.

## Decision

Define project-scoped Codex agents under `.codex/agents/`: a GPT-5.5 planner and reviewer in read-only sandboxes, a GPT-5.4-mini implementer for bounded low-risk work, a GPT-5.5 senior implementer for complex or high-risk work, and a GPT-5.4-mini read-only verifier. Limit nesting to one level and concurrent threads to four. Route implementation by risk, allow only one writer per overlapping scope, keep verification independent, and retain final integration responsibility in the coordinating agent. Activate this workflow only after an explicit user request for subagents or multi-agent work.

## Consequences

- Expensive reasoning is concentrated on ambiguous, high-risk, and review tasks.
- Bounded implementation and deterministic verification can use faster lower-cost agents.
- High-risk discoveries can escalate instead of forcing a small model to follow an invalid plan.
- Read-heavy work can run in parallel without polluting the main context, while overlapping writes remain serialized.
- Multi-agent runs consume more total tokens and require clear handoffs and final coordination.

## Alternatives Considered

- Use one model for every task: rejected because it ignores meaningful cost and latency differences between bounded and complex work.
- Always assign coding to a small model: rejected because implementation often exposes architectural or safety-critical decisions.
- Let the verifier repair failures: rejected because independent evidence is weakened when the same role both judges and changes the result.
- Spawn agents automatically for every task: rejected because Codex requires explicit invocation and small tasks do not justify the coordination overhead.
