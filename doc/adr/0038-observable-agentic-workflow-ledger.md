# ADR-0038: Observable Agentic Workflow Ledger

## Status

Accepted

## Context

The repository had deterministic path contracts and tool-use hooks, but work still appeared as a single coordinating-agent stream. The workflow lacked an observable intake trigger, state ledger, and mandatory agent-routing gate.

This created a gap between declared governance and runtime behavior: the contract could be checked after tool use, yet a task could begin without a visible `intake` event or required planner, implementer, and verifier routing evidence.

## Decision

Add `contracts/governance/agentic-workflow-events.json` as the machine-readable contract for workflow events. Record runtime events in `reports/agentic-workflow-events.jsonl` and the active run in `reports/agentic-workflow-current.json`.

Use Codex lifecycle hooks for deterministic observability:

- `UserPromptSubmit` records `intake.started`.
- `SubagentStart` records `agent.started`.
- `SubagentStop` records `agent.completed`.
- `PreToolUse` checks intake and required routing events before governed mutating work, then records `workflow.violation` when repair is required.
- `Stop` checks completion requirements, records `workflow.violation` when repair is required, and records `workflow.completed` only when required events exist.

For `high-change`, `planner.completed` and `implementer.started` are required before mutating tool use, and `verifier.completed` is required before workflow completion.

Expose `npm run workflow:status` for human-readable status and include workflow status in the agentic compliance report. Status is scoped to the active run and must show `repair-loop` plus active violations when hooks detect missing routing.

## Consequences

The workflow becomes visible and auditable while keeping report files out of Git. Hook violations remain repair triggers, and the same runtime event contract is used by hooks, status, validation, and compliance reporting.

High-change work now requires explicit agent routing evidence. If Codex does not start the required subagents, governed mutating work enters repair mode instead of continuing as a single-agent hidden flow.

## Alternatives Considered

- Rely only on `AGENTS.md`: rejected because instructions are not a mechanical runtime gate.
- Validate only at handoff: rejected because out-of-workflow mutations could already have happened.
- Auto-spawn agents from hooks: rejected because current Codex command hooks record and validate events; subagent execution is coordinated by the agent workflow.
