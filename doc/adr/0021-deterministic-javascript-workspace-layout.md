# ADR-0021: Deterministic JavaScript Workspace Layout

## Status

Superseded by ADR-0022 — 2026-06-10

## Context

The workspace used `.agents/skills/` for repository skills and `.codex/agents/` for subagent definitions. Their similar names suggested duplication even though Codex assigns them different discovery rules and schemas. Executable maintenance logic also used `.js`, while the project requires an explicit JavaScript ESM convention for agentic workflows. The application entry point remained at the repository root and the original package name no longer reflected the desired product identity.

## Decision

Keep `.agents/skills/` and `.codex/agents/` as separate Codex surfaces. Preserve required declarative formats: `SKILL.md`, skill metadata YAML, agent TOML, governance Markdown, and the extensionless Git hook entry point. Put executable workflow and maintenance logic under `script/` and require ESM `.mjs`; keep `hooks/commit-msg` as a minimal POSIX adapter that invokes the JavaScript validator.

Move the application entry point to `lib/server.js`, rename the product and package to `easy-mark`, and split governance validation into immutable specifications, pure validators, and filesystem orchestration. Sort recursive scans and final diagnostics explicitly so repeated runs produce stable results.

The application directory placement in this decision is superseded by [ADR-0022](0022-core-server-web-and-user-overrides.md). The remaining governance and deterministic workflow decisions are unchanged.

For commit validation, resolve `core.commentString` and `core.commentChar` in effective Git configuration order. Apply only cleanup behavior that the `commit-msg` hook can determine: preserve `default`, unset, and `verbatim`; apply `strip` and `whitespace`; and treat `scissors` as whitespace-only because its truncation depends on whether the message was edited.

## Consequences

- Codex continues to discover skills and subagent roles through their supported locations.
- Workflow executables have one language and module convention without converting declarative artifacts into invalid JavaScript.
- The repository root contains no application entry point.
- Governance rejects every maintenance file under `script/` whose extension is not `.mjs` and uses code-unit total ordering for scans and diagnostics.
- Imports, package scripts, tests, and documentation must reference the new `.mjs` and `lib/server.js` paths.

## Alternatives Considered

- Move skills under `.codex/agents/`: rejected because skill discovery and agent configuration use different directories and schemas.
- Convert skills, guardrails, and agent definitions to JavaScript: rejected because Codex and repository governance consume their declarative formats directly.
- Keep `server.js` at the repository root: rejected because runtime ownership belongs under `lib/` and the root should remain focused on project metadata.
- Allow multiple script languages by convention: rejected because it weakens determinism and increases maintenance surface without a current need.
