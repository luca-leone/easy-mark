# ADR-0036: Governance Contract Layout

## Status

Accepted

## Context

The deterministic workflow introduced machine-readable governance contracts for agentic paths and Markdown governance. Storing those JSON contracts in `rules/` blurred the boundary between executable contracts and human-readable operating guidance.

The repository also kept the versioned Git hook adapter at `hooks/commit-msg`, while other deterministic hooks already used context-specific names and directories. The old layout made it harder to see which files were contracts, which files were explanatory rules, and which files were executable adapters.

## Decision

Store machine-readable governance contracts under `contracts/governance/`.

Keep `contracts/application-contract.md` as the readable product behavior contract. Keep `rules/` for operating guidance that explains how contracts are applied. Keep `guardrails/` as the explicit invariant index for product, governance, hook, contract, and budget constraints.

Store the versioned Git hook adapter under `hooks/git/commit-msg` and configure clones through `core.hooksPath=hooks/git`. Do not store repository source in `.git/hooks`; that directory is local Git state and is not reviewable source.

Validators, runtime hooks, reports, tests, and documentation must reference the canonical contract paths:

- `contracts/governance/agentic-paths.json`
- `contracts/governance/markdown-governance.json`

## Consequences

Machine-readable governance contracts now live under the highest-priority source-of-truth directory. Rule documents can stay concise and explanatory. Guardrails explicitly state the invariant that JSON governance contracts belong under `contracts/governance/`.

The Git hook remains versioned and reviewable, while the installed hooks path points at the context-specific hook directory. Existing clones need to run `npm run hooks:install` after this change to refresh local `core.hooksPath`.

## Alternatives Considered

- Keep JSON contracts in `rules/`: rejected because rules then mix executable contract ownership with prose guidance.
- Move the hook directly into `.git/hooks`: rejected because `.git/hooks` is clone-local state outside repository review and validation.
- Keep `core.hooksPath=hooks` with a nested `hooks/git/commit-msg`: rejected because Git would not discover `commit-msg` in that nested directory.
