# ADR-0005: Repository Governance and Persistent Context

## Status

Accepted — 2026-06-08

## Context

The architecture and constraints were established through an interactive engineering session. Future agents and human contributors need durable, consistent context that distinguishes current behavior, architectural rationale, chronological memory, and non-negotiable constraints.

## Decision

Use root `AGENTS.md` as the operational index. Treat `contracts/` as normative current behavior, `doc/adr/` as architectural rationale, and `memory/decisions.md` as an append-only chronological index. Store working rules, guardrails, evaluation criteria, scripts, and report policy in dedicated directories. Validate structure and references automatically before tests.

## Consequences

- Contributors have an explicit reading and update workflow.
- Historical decisions remain traceable without making the memory log normative.
- Documentation drift becomes test-detectable.
- Governance changes add maintenance cost and must remain concise.

## Alternatives Considered

- Store all context in `AGENTS.md`: rejected because normative behavior, rationale, and history have different lifecycles.
- Create every possible governance directory immediately: rejected because empty placeholders provide no operational value.
- Keep decisions only in chat: rejected because chat context is not a durable repository artifact.

