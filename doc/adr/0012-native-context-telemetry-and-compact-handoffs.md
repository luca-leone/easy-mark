# ADR-0012: Native Context Telemetry and Compact Handoffs

## Status

Accepted — 2026-06-08

## Context

Long Codex sessions need early warning before context exhaustion. A repository skill can enforce a workflow, but skills and lifecycle hooks do not receive authoritative remaining-context telemetry and cannot invoke `/compact` on the user's behalf. Estimating tokens from visible text would be incomplete because hidden instructions, tool records, and compaction state also consume context.

## Decision

Configure the project TUI status line to show `context-remaining` continuously and use `/status` for detailed manual checks. Add an explicitly invoked repository skill at `.agents/skills/context-budget-monitor` that accepts only native telemetry, applies thresholds at 50%, 30%, and 15%, reduces context waste, and prepares a durable handoff before recommending `/compact`. Keep implicit invocation disabled and do not add a token-meter hook.

## Consequences

- Remaining capacity is displayed by Codex itself rather than approximated by repository code.
- The skill adds operational discipline without claiming access to unavailable metrics.
- The user retains control over manual compaction.
- Long tasks require explicit checkpoints at phase boundaries or threshold crossings.
- Project-local Codex configuration must be trusted before it is loaded.

## Alternatives Considered

- Count characters or tokenize the visible transcript: rejected because it cannot account for the full model context.
- Run a hook after every turn: rejected because hook input does not expose authoritative remaining capacity and frequent hooks add noise.
- Rely only on automatic compaction: rejected because an explicit handoff provides better preservation of repository decisions and next steps.
- Enable implicit skill invocation: rejected because always loading monitoring instructions would itself consume context.
