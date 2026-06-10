---
name: context-budget-monitor
description: Monitor Codex context-window capacity using authoritative `/status` or `context-remaining` telemetry, apply 50/30/15 percent thresholds, reduce context waste, and prepare a durable handoff before recommending `/compact`. Use explicitly during long repository tasks, after large tool outputs, before starting another major phase, or when the user asks about tokens, context capacity, compaction, or remaining context. Never estimate token usage from transcript length.
---

# Context Budget Monitor

Use Codex-native telemetry as the only source of context capacity. Never invent a token count or infer a percentage from message length.

## Read Capacity

1. Read the latest exact `context-remaining` value already visible in the session or the latest `/status` output.
2. If no exact value is available to the agent, ask the user to run `/status` and provide the remaining percentage.
3. Distinguish context-window capacity from rate limits and account usage.

## Apply Thresholds

- Above 50%: continue normally while keeping tool output scoped.
- At or below 50%: note the checkpoint once; avoid redundant file reads and broad command output.
- At or below 30%: finish the current atomic operation and prepare the handoff below before starting another major phase.
- At or below 15%: do not begin a new subtask. Verify durable state, present the handoff, and strongly recommend that the user run `/compact`.

Do not repeat the same threshold warning unless the session crosses a lower threshold or material state changes.

## Prepare Handoff

Produce a compact handoff containing only:

- current objective and completion state;
- confirmed decisions and constraints;
- changed files and essential changes;
- validation commands and outcomes;
- unresolved issues or risks;
- exact next action after compaction.

Before recommending `/compact`:

1. Check that material decisions are recorded in the repository contract, ADRs, or `memory/decisions.md` when the project requires it.
2. Check that the active implementation step is complete or explicitly described as incomplete.
3. Avoid embedding large diffs, logs, or source excerpts in the handoff.
4. Tell the user to run `/compact`; do not claim to invoke it automatically.

## Resume After Compact

After compaction, compare the compacted summary with repository state before editing. Re-read only the files required for the next action and report any mismatch before proceeding.

## Boundaries

- Do not use hooks or local scripts as token meters; hook payloads do not expose authoritative remaining context.
- Do not modify model context limits or automatic compaction thresholds unless explicitly requested.
- Do not confuse token optimization with omitting required tests, decisions, or safety checks.
