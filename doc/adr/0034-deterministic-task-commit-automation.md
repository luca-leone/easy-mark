# ADR-0034: Deterministic Task Commit Automation

## Status

Accepted - 2026-06-16

## Context

Completed repository tasks were previously handed off with uncommitted changes unless the user explicitly requested staging and committing. That preserved human control but created an avoidable manual step after tasks that had already passed quality gates and verification.

The repository already has Conventional Commit validation, deterministic governance checks, and a user preference that push remains human-controlled. The missing piece is a deterministic task-finalization command that can stage and commit verified work without inventing commit semantics conversationally.

## Decision

Add `script/git/auto-task-commit.mjs` and expose it as `npm run task:commit`. The command stages all task changes with `git add --all`, reads the staged file set, derives a Conventional Commit message from deterministic path classes, validates that message with the existing commit-message policy, creates the commit, and prints the resulting short SHA.

The command also applies local tag creation when version semantics require a tag, while leaving remote publication manual. It proposes and creates:

- major for breaking Conventional Commits;
- minor for `feat`;
- patch for `fix` and `build(package)`;
- no package version change for `docs`, `test`, `chore`, `refactor`, and `ci` by default.

Add `$auto-commit` as the repository skill for task-finalization. It must be used only after verification passes. The command prints `git push origin <tag>` when it creates a tag. Push remains manual and human-controlled unless explicitly requested.

## Consequences

- End-of-task commits become repeatable and auditable.
- Commit messages remain validated by the same policy as human-authored messages.
- Version and local tag creation are consistent across tasks without forcing releases for documentation or governance-only work.
- Human control is preserved for push and for any explicit release/tag execution.

## Alternatives Considered

- Keep every commit manual: rejected because the user requested automatic end-of-task staging and committing.
- Let the language model freely choose every commit message: rejected because it is less deterministic and harder to test.
- Automatically run `npm version` and push: rejected because package version mutation and remote publication remain human decisions.
