# Acceptance Checklist

## Build and Filesystem

- [ ] `npm run start` launches `easy-mark` through `core/server/server.js`; no application entry point remains in the repository root.
- [ ] Startup succeeds with the bundled `core/web` templates and at least one Markdown file, without requiring shell or stylesheet files in `src/`.
- [ ] Valid `src/index.html` and `src/styles.css` files override their bundled templates, and deleting them restores the defaults.
- [ ] A valid optional `src/manifest.json` customizes the shell and dynamic browser title; deletion restores `easy-mark`, and invalid updates preserve the last valid state.
- [ ] An optional validated manifest logo uses the bundled `/logo.svg` by default, supports same-path `src/` overrides and custom local image paths, and disappears cleanly when unavailable.
- [ ] Missing required inputs fail with explicit errors.
- [ ] Source directory structure is preserved in `mem-fs`.
- [ ] No generated `.html` files appear on disk beyond the authored shell.

## Rendering and Security

- [ ] CommonMark and GFM constructs render correctly.
- [ ] Unsafe scripts and event handlers are removed.
- [ ] Full-text search extraction runs after HAST sanitization, preserves visible code/table/link/allowed-HTML text with deterministic separators, and excludes URLs, attributes, comments, paths, raw Markdown/HTML, and removed dangerous content.
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
- [ ] The header search launcher opens an accessible modal, closes an open mobile drawer, traps and restores focus, locks body scrolling, and dismisses through Escape, close, or backdrop.
- [ ] The document manifest exposes only `{ route, aliases, title, text }` in deterministic order with script-safe escaping and live add/change/unlink updates; PDF export remains unchanged.
- [ ] Search normalizes Unicode and whitespace, deduplicates tokens, requires every token across metadata plus sanitized body, and deterministically ranks title, canonical-route, alias, body-phrase, body-AND, and mixed-field matches with manifest-order ties.
- [ ] Result descriptors expose rank and match source; metadata-only matches omit snippets, while body-dependent matches show deterministic original-text snippets of at most 180 code points with correct phrase/token selection and ellipses.
- [ ] Empty search shows every document, zero matches show text, and every result displays and navigates to its canonical route.
- [ ] Typing updates only the overlay draft; Escape, backdrop, close, selection, and controller dismissal commit it, reopening restores it, and selection does not restore launcher focus.
- [ ] The custom clear button appears only for non-empty drafts, clears through native button activation, restores all results, keeps the overlay open, and focuses the input while the native WebKit clear control stays suppressed.
- [ ] Search supports Arrow Up, Arrow Down, Home, End, and Enter, uses the responsive second header row and mobile panel, and remains usable in both themes and reduced motion.
- [ ] Existing `src/index.html` overrides without the complete search hook set, including `search-clear`, continue to work without partially initialized search behavior or unrelated parent hiding.

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
