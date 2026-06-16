---
name: auto-commit
description: Deterministically stage all completed task changes, create a validated Conventional Commit, and report version/tag proposals while leaving push under human control. Use at the end of repository tasks after verification has passed.
---

# Auto Commit

Use this skill at the end of a completed repository task after `$quality-gate` and required verification pass.

## Procedure

1. Confirm verification status is known.
2. Run `npm run task:commit`.
3. Report the commit SHA, subject, version proposal, and tag proposal printed by the script.
4. Do not push. The human remains responsible for `git push`.

## Determinism

The command stages with `git add --all`, derives a Conventional Commit message from the changed path classes, validates the message with repository policy, commits with that exact message, and prints deterministic version/tag guidance.

If the generated message does not describe the task well enough, run:

```sh
npm run task:commit -- --message "type(scope): description"
```

The override must still validate through the repository commit-message policy.

## Version And Tag Proposal

- `feat`: propose a minor version and tag.
- `fix`: propose a patch version and tag.
- `type!` or `BREAKING CHANGE:`: propose a major version and tag.
- `build(package)`: propose a patch version and tag.
- `docs`, `test`, `chore`, `refactor`, and `ci`: propose no package version change by default.

Push remains manual.
