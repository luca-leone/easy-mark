# ADR-0020: Context-Aware Commit Validation

## Status

Accepted

## Context

[ADR-0019](0019-versioned-conventional-commit-policy.md) established the commit policy, but its first validator treated every message as if Git used `#` comments and scissors cleanup. It also accepted any subject beginning with `Merge ` outside a merge, overwrote existing local hook paths, and did not cover all native autosquash subjects. These behaviors could reject valid local configurations or accept misleading standalone messages.

## Decision

Supersede ADR-0019's validation details with context-aware hook behavior. Standalone file and `--message` validation preserve supplied text and reject merge subjects conservatively. Hook validation reads effective `commit.cleanup` and `core.commentChar`, supports `strip`, `whitespace`, `verbatim`, and `scissors`, and permits a normal `Merge ...` subject only when `MERGE_HEAD` exists.

Accept Git revert subjects with outer quotes even when the reverted subject contains quotes. Accept native `fixup!`, `squash!`, and `amend!` subjects only when their target is a valid Conventional Commit header. Treat `!` and breaking footers as independent indicators; every present `BREAKING CHANGE:` or `BREAKING-CHANGE:` footer must contain exactly a colon, one separating space, and a non-empty description.

The hook installer sets local `core.hooksPath=hooks` only when absent, remains idempotent when already equal, and refuses to overwrite any different value. The hook reports a direct Node.js PATH requirement instead of embedding a machine-specific executable path.

## Consequences

Validation now matches repository-specific Git cleanup behavior and merge state while explicit validation remains deterministic and conservative. Existing hook managers are preserved rather than silently displaced. The implementation has more Git-context branches, requiring real-hook integration tests across cleanup, custom comment characters, merge commits, and initial commits.

## Alternatives Considered

- Always strip `#` comments: rejected because it conflicts with custom comment characters and verbatim cleanup.
- Accept merge-looking subjects everywhere: rejected because standalone commits could bypass the Conventional Commit policy.
- Add an implicit installer override or `--force`: rejected because replacing another hook manager must require a separate manual decision.
