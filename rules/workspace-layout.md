# Workspace Layout

## Scope

This file defines repository structure and ownership boundaries. It is a working rule, not product behavior and not an agent bootstrap document.

## Directories

- `core/server/`: server runtime, conversion, virtual filesystem, navigation, and HTTP behavior.
- `core/web/`: bundled app shell and stylesheet templates, browser runtime, and default static assets.
- `test/`: Node unit and integration tests.
- `rules/`: repository engineering, release, context, multi-agent, command, layout, and deterministic workflow rules.
- `contracts/`: normative application behavior.
- `guardrails/`: non-negotiable system invariants.
- `script/`: repository validation and maintenance scripts.
- `hooks/`: versioned Git hooks installed through `npm run hooks:install`.
- `evaluation/`: acceptance criteria used for human and automated review.
- `memory/`: concise append-only decision history for agents.
- `doc/adr/`: human-facing MADR architecture decision records.
- `reports/`: documentation for generated reports; generated outputs are ignored.
- `.agents/skills/`: repository-scoped Codex skills, expressed as required `SKILL.md` documents and optional skill metadata.
- `.codex/agents/`: TOML definitions for project-local Codex subagent roles; this is distinct from skill discovery.
- `.codex/`: trusted project-local Codex configuration.

## Boundaries

- Do not merge `.agents/skills/` into `.codex/agents/`: the directories are separate Codex surfaces with different schemas.
- Create `hooks/` only when a concrete repository hook is implemented.
- Store repository skills under `.agents/skills/`, not a root `skills/` directory.
- Do not add empty placeholder directories.
