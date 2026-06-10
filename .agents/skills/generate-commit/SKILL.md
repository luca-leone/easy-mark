---
name: generate-commit
description: Inspect Git status and staged diffs, propose a semantic Conventional Commit message, validate it against repository policy, and create or stage a commit only when the user explicitly requests those mutations. Use when the user asks to prepare, propose, validate, or create a commit in this repository.
---

# Generate Commit

## Inspect

1. Run `git status --short` and `git diff --cached --stat`.
2. Read `git diff --cached` to understand the staged behavior change. Paths can inform scope, but never determine type or description by themselves.
3. If nothing is staged, report that fact. Do not stage files unless the user explicitly asks you to select and stage changes.
4. Account for a repository without `HEAD`; use staged state as the source of truth for an initial commit.

## Propose

Write a concise message matching repository policy:

```text
type(optional-scope)!: description
```

Allowed types are `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `build`, and `ci`. Add a body only when it explains motivation or a non-obvious consequence. Use `!` and a `BREAKING CHANGE:` footer when compatibility is intentionally broken.

Validate the proposal before presenting it. Create a temporary message file outside the repository with an available filesystem-editing tool, preserving the intended text exactly, then pass its absolute path to `npm run commit:validate -- <message-file>`. Do not interpolate generated commit text into a shell command. Remove the temporary file after validation.

## Apply

- A request to propose or generate a message is not permission to stage or commit.
- Stage files only after explicit user instruction and verify the resulting staged diff.
- Create the commit only after explicit user instruction, using the validated message exactly.
- Do not use `--no-verify`, alter hook configuration, amend, force, or rewrite history unless separately requested.
- Do not write a report unless it has concrete value for the user's task.

After committing, report the commit SHA, subject, and files included.
