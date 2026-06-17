# ADR-0019: Versioned Conventional Commit Policy

## Status

Superseded by [ADR-0020](0020-context-aware-commit-validation.md)

## Context

Commit messages need a consistent machine-checkable shape without importing another project's Claude-specific workflow, release semantics, or `commitlint` dependencies. A local hook gives contributors immediate feedback, but it is clone-specific and bypassable. Semantic type and description cannot be inferred reliably from changed file paths alone.

## Decision

Adopt a dependency-free Node.js 22 validator for the repository's Conventional Commit subset. Accept the types `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `build`, and `ci`, optional scopes, `!`, and breaking-change footers. Explicitly permit Git-generated merge and revert subjects and autosquash `fixup!` and `squash!` subjects whose targets are valid Conventional Commit headers.

Keep `hooks/git/commit-msg` under version control and configure each clone explicitly with an idempotent `npm run hooks:install` command that sets local `core.hooksPath=hooks/git`. Provide a non-implicit Codex skill that reads status and the full staged diff, proposes a semantic message, validates it, and stages or commits only after explicit user instruction.

## Consequences

Contributors receive fast offline validation with no new runtime or development dependency. Initial commits and repositories without `HEAD` are supported. The hook can still be bypassed with `--no-verify`, disabled locally, or omitted in another clone, so it is not a security boundary or server-side enforcement mechanism.

## Alternatives Considered

- Import `commitlint` and the external generator: rejected because it adds dependencies and unrelated release semantics.
- Generate type and scope deterministically from paths: rejected because paths do not establish the intent of a change.
- Rely only on written guidance: rejected because it delays feedback and permits avoidable formatting drift.
