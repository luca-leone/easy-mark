# Project Rules

## Engineering

- Prefer root-cause fixes and minimal, focused changes.
- Keep server modules in ESM and browser modules dependency-free unless a dependency is justified.
- Support Node.js 22 and later as declared by `package.json`; develop and run required verification against the Node.js 22 baseline in `.nvmrc`.
- Use descriptive names and avoid one-letter identifiers.
- Normalize URL paths as POSIX paths; use `node:path` for filesystem paths.
- Do not add platform-specific shell assumptions to application behavior.
- Do not change unrelated behavior while implementing a request.
- Keep runtime server modules under `core/server/`; `core/server/server.js` is the application entry point.
- Keep bundled browser JavaScript, templates, and static assets under `core/web/`. Keep `src/` for user-authored Markdown, assets, and optional `index.html` and `styles.css` overrides.
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

## Documentation

- Keep `contracts/application-contract.md` synchronized with observable behavior.
- Append material decisions to `memory/decisions.md` using its defined format.
- Use a new ADR for architectural decisions; use `Superseded` status and cross-links instead of rewriting historical decisions.
- Write governance documentation in English. Preserve technical identifiers exactly.

## Context Management

- Keep `context-remaining` visible in the Codex status line.
- Use native `/status` output for exact capacity checks.
- Use `$context-budget-monitor` for threshold policy and pre-compact handoffs.
- Avoid broad tool output, repeated file reads, and pasted diffs when the remaining context is at or below 50%.
- Do not add a token-meter hook unless Codex exposes authoritative context capacity in hook payloads.

## Multi-Agent Work

- Start subagents only after an explicit user request for multi-agent work.
- Choose agent capability by task risk, not by workflow stage alone.
- Use the mini implementer only for bounded work with explicit acceptance criteria and an objective verification path.
- Escalate ambiguous or high-risk implementation to the senior implementer.
- Keep verification independent from implementation and prohibit the verifier from repairing its own findings.
- Avoid concurrent writers on overlapping files; prefer parallel read-only analysis and review.
