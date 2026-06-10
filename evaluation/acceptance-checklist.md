# Acceptance Checklist

## Build and Filesystem

- [ ] `npm run start` launches `easy-mark` through `core/server/server.js`; no application entry point remains in the repository root.
- [ ] Startup succeeds with the bundled `core/web` templates and at least one Markdown file, without requiring shell or stylesheet files in `src/`.
- [ ] Valid `src/index.html` and `src/styles.css` files override their bundled templates, and deleting them restores the defaults.
- [ ] Missing required inputs fail with explicit errors.
- [ ] Source directory structure is preserved in `mem-fs`.
- [ ] No generated `.html` files appear on disk beyond the authored shell.

## Rendering and Security

- [ ] CommonMark and GFM constructs render correctly.
- [ ] Unsafe scripts and event handlers are removed.
- [ ] Heading IDs are stable, unique, and Unicode-safe.
- [ ] Relative Markdown links become valid SPA links.

## Browser Behavior

- [ ] `/` opens the first ordered document.
- [ ] Direct document URLs return the shell and load their fragment.
- [ ] Menu hierarchy reflects documents and heading levels.
- [ ] History back and forward navigation works.
- [ ] Encoded Unicode anchors scroll without selector errors.
- [ ] Authored Markdown and HTML templates cannot be fetched as static assets.
- [ ] HTTP responses include the required security headers.
- [ ] Runtime error messages render as text rather than HTML.
- [ ] Google Sans loads from local WOFF2 files without external font requests.
- [ ] Body copy remains readable at an 18px desktop base size and responsive mobile size.
- [ ] Theme initializes without a light-mode flash and persists explicit user choice.
- [ ] Both palettes preserve readable text, links, code, tables, focus rings, and navigation states.
- [ ] Ionicons load locally with no external icon requests.
- [ ] The mobile drawer opens from the hamburger and closes by button, backdrop, Escape, or navigation.
- [ ] Drawer focus remains contained and returns to the hamburger after dismissal.
- [ ] At every width of at least 900px, the hamburger collapses the in-layout sidebar without backdrop or focus trapping.
- [ ] Inline sidebar preference persists across reloads and landscape viewport widths.
- [ ] Reading progress reaches expected top, middle, and end values and resets after navigation.

## Live Updates

- [ ] Adding, changing, and deleting Markdown updates virtual content and navigation.
- [ ] Events are serialized and trigger one browser reload notification per completed update.
- [ ] A failed event does not prevent later events from being processed.
- [ ] Reload preserves valid routes and falls back from removed routes.

## Governance

- [ ] `.agents/skills/` and `.codex/agents/` remain separate, documented Codex surfaces with their required schemas.
- [ ] Executable workflow and maintenance logic under `script/` uses only ESM `.mjs`; governance rejects every other file extension there.
- [ ] Governance scans and diagnostics use explicit deterministic ordering.
- [ ] `npm run validate:governance` passes.
- [ ] Observable behavior matches `contracts/application-contract.md`.
- [ ] Architectural changes have an ADR and a decision-log entry.
- [ ] `npm test` passes.
- [ ] The Codex status line includes `context-remaining`.
- [ ] The repository skill validates and cannot invoke implicitly.
- [ ] Context guidance uses 50%, 30%, and 15% thresholds without claiming estimated counts are exact.
- [ ] Pre-compact handoffs preserve objective, decisions, changes, tests, risks, and next action.
- [ ] Project agent definitions validate with the intended model, reasoning, and sandbox boundaries.
- [ ] Multi-agent runs are explicitly requested, risk-routed, independently verified, and avoid overlapping writers.
- [ ] Commit-message validation accepts documented Conventional Commit, merge, revert, and native autosquash forms, rejects malformed breaking footers, and respects Git cleanup, comment, and merge context.
- [ ] `npm run hooks:install` is idempotent, configures only local `core.hooksPath` when no applicable value exists, refuses to override effective global/local/worktree settings, and works before the initial commit.
- [ ] The generate-commit skill inspects staged diffs and never stages or commits without explicit user approval.
