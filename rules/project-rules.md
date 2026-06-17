# Project Rules

## Engineering

- Prefer root-cause fixes and minimal, focused changes.
- Use ESM and Node.js standard APIs where practical.
- Keep server modules in ESM and browser modules dependency-free unless a dependency is justified.
- Support Node.js 22 and later as declared by `package.json`; develop and run required verification against the Node.js 22 baseline in `.nvmrc`.
- Use descriptive names and avoid one-letter identifiers.
- Normalize URL paths as POSIX paths; use `node:path` for filesystem paths.
- Keep path handling portable across operating systems.
- Do not add platform-specific shell assumptions to application behavior.
- Do not change unrelated behavior while implementing a request.
- Keep runtime server modules under `core/server/`; the public CLI under `bin/` is the application entry point.
- Keep bundled browser JavaScript, templates, and static assets under `core/web/`. Treat the CLI positional directory as the user content root for Markdown, public assets, and optional `manifest.json`; do not support content-root `index.html` or `styles.css` overrides.
- Keep the public NPM executable under `bin/` and include package runtime assets through explicit package metadata.
- Use locally vendored official Ionicons outline SVGs for interface icons unless an ADR explicitly accepts an exception.
- Use ESM `.mjs` for all executable workflow and maintenance logic under `script/`; do not add `.js`, `.cjs`, or Python scripts there.
- Keep platform declarations in their required native formats rather than disguising them as executable code.
- Prefer the most deterministic practical approach, including explicit total ordering and stable error output.

## Quality

- Run `npm test` after implementation changes.
- Add tests adjacent to the behavior being changed.
- Test failure modes where they are part of a public contract.
- Do not weaken sanitization, path traversal protection, or in-memory-only output guarantees.

## Commit Messages

- Use `type(optional-scope)!: description` with one of: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `build`, or `ci`.
- Use `!` and/or a rigorously formed `BREAKING CHANGE: description` or `BREAKING-CHANGE: description` footer for incompatible changes; neither form requires the other.
- Allow Git-generated merge subjects beginning with `Merge ` only while Git reports an active merge, and revert subjects with Git's outer `Revert "..."` form, including inner quotes.
- Allow native `fixup!`, `squash!`, and `amend!` subjects only when the target subject is itself a valid Conventional Commit header.
- Reproduce `commit.cleanup=strip|whitespace` in hook validation. Preserve input for `default`, unset, and `verbatim`; treat `scissors` as whitespace-only because `commit-msg` cannot determine whether Git will apply the edit-only truncation. Resolve `core.commentString` and `core.commentChar` as aliases using their effective configuration order. Standalone validation treats supplied text literally and does not infer merge state.
- Keep descriptions specific to the staged semantic change; do not derive meaning from file paths alone.
- Install the local `commit-msg` hook with `npm run hooks:install`. Treat it as immediate feedback, not security enforcement: `--no-verify` and commits created elsewhere can bypass it.
- After a verified task, use `$auto-commit` or `npm run task:commit` to stage all task changes, create the validated commit automatically, and create the proposed local tag when version semantics require one. Push remains a human action unless explicitly requested.
- Treat script-generated version output and tag push command as deterministic release guidance. Apply package version bumps only when the task is intended to produce a release.

## Documentation

- Keep `contracts/application-contract.md` synchronized with observable behavior.
- Append material decisions to `memory/decisions.md` using its defined format.
- Use a new ADR for architectural decisions; use `Superseded` status and cross-links instead of rewriting historical decisions.
- Write governance documentation in English. Preserve technical identifiers exactly.
- Follow [Markdown Governance](markdown-governance.md) and `contracts/governance/markdown-governance.json` for governed Markdown scope, line limits, modal wording, hooks, reports, and repair mode.
- Keep `AGENTS.md` as a concise bootstrap guide; move detailed operating policy, command lists, and repository maps to `rules/`, invariants to `guardrails/`, observable behavior to `contracts/`, and rationale to `doc/adr/`.

## Context Management

- Keep `context-remaining` visible in the Codex status line.
- Use native `/status` output for exact capacity checks.
- Use `$context-budget-monitor` for threshold policy and pre-compact handoffs.
- Use `$resource-budget-gate` for non-trivial tasks to declare context, concurrency, duration, and provider budgets before execution.
- Avoid broad tool output, repeated file reads, and pasted diffs when the remaining context is at or below 50%.
- Do not add a token-meter hook unless Codex exposes authoritative context capacity in hook payloads.

## Multi-Agent Work

- Start subagents only after an explicit user request for multi-agent work.
- Available project agents are `planner`, `implementer`, `senior-implementer`, `reviewer`, and `verifier`.
- Invoke a project agent with the practical form `Invoca <agent-name>: <precise task>. <constraints and expected output>`.
- Choose agent capability by task risk, not by workflow stage alone.
- Use the mini implementer only for bounded work with explicit acceptance criteria and an objective verification path.
- Escalate ambiguous or high-risk implementation to the senior implementer.
- Keep verification independent from implementation and prohibit the verifier from repairing its own findings.
- Avoid concurrent writers on overlapping files; prefer parallel read-only analysis and review.
