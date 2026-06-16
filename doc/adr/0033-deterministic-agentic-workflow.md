# ADR-0033: Deterministic Agentic Workflow

## Status

Accepted — 2026-06-16

## Context

The repository already defines governance documents, project-scoped skills, and explicit multi-agent roles. Those pieces prevent many classes of drift, but they do not by themselves force every non-trivial prompt through the same deterministic intake, requirements reconciliation, routing, quality, and repair loops.

Relying on conversational judgment alone creates inconsistent behavior: one task may receive planner analysis and independent verification while another similar task may proceed directly to implementation; a failing guardrail may be reported instead of repaired; or a final handoff may omit which source-of-truth documents were checked.

The workspace needs a versioned orchestration policy that makes the coordinating agent's behavior predictable, auditable, and testable without weakening the existing rule that subagents are started only after explicit user request or a repository-defined risk-routed workflow has been invoked.

## Decision

Adopt a deterministic agentic workflow for every non-trivial repository task. The workflow is a state machine with these ordered states:

1. `intake`
2. `classification`
3. `requirements-discovery`
4. `requirements-reconciliation`
5. `routing`
6. `planning`
7. `execution`
8. `quality-review`
9. `contract-guardrail-check`
10. `verification`
11. `repair-loop`
12. `handoff`

Each state has explicit inputs, outputs, and exit criteria. The coordinating agent may skip only states that are objectively inapplicable to a trivial request, and must preserve the ordering of every state that remains applicable. Non-trivial work must define acceptance criteria before implementation, map each acceptance criterion to verification, and run the repair loop when any test, governance rule, contract, guardrail, ADR requirement, reviewer finding, verifier finding, or acceptance criterion fails.

Add `.agents/skills/orchestrate-request` to perform deterministic prompt intake, requirement extraction, source-of-truth reconciliation, risk routing, skill selection, acceptance criteria generation, and verification matrix definition.

Add `.agents/skills/quality-gate` to perform deterministic diff review, contract and guardrail checks, test coverage checks, repair-loop triggering, and final handoff gating.

Update project agent instructions so planner, implementer, senior-implementer, reviewer, and verifier each operate inside the workflow. The planner normalizes requirements and plans verification; implementers execute approved plans; reviewer evaluates behavioral and governance regressions; verifier runs deterministic checks without repair; the coordinating agent remains responsible for final integration and `npm test`.

Governance validation must assert the presence of the workflow, the two skills, the required loops, and the separation between `.agents/skills/` and `.codex/agents/`.

## Consequences

- Prompt handling becomes repeatable because requirements, routing, execution, quality, repair, and handoff are expressed as a state machine.
- High-risk work receives deterministic routing instead of ad hoc escalation.
- Violations are not merely reported when repair is possible; they trigger a bounded repair loop followed by re-verification.
- The repository gains additional skill and governance surface area that must be maintained with the same discipline as runtime code.
- Small requests may feel more structured, but trivial commands can still follow the minimal applicable subset of the state machine.

## Alternatives Considered

- Keep orchestration as informal coordinator judgment: rejected because it does not provide deterministic loops, testable routing, or repeatable repair behavior.
- Always run every subagent for every prompt: rejected because Codex subagents require explicit invocation or a repository-defined workflow, and trivial tasks do not justify multi-agent overhead.
- Encode orchestration only in agent TOML files: rejected because skills and repository governance tests provide a reusable, triggerable, and validated policy surface.
- Implement an external workflow engine immediately: rejected because the repository first needs a documented and tested policy before automating command-level enforcement.
