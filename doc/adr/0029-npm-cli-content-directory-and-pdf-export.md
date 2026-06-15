# ADR-0029: NPM CLI, Content Directory, and PDF Export

## Status

Accepted — 2026-06-15

## Context

The application started as a repository-local server over `src/`, with optional full-file `index.html` and `styles.css` overrides. Turning it into a distributable NPM package requires a stable `easy-mark` executable that can operate on any user-selected content directory without mixing package-owned runtime files with authored documentation.

Users also need a command that writes a final PDF artifact directly. The existing browser UI uses native print and does not write generated HTML or PDF files to disk.

## Decision

Publish `easy-mark` as an NPM package with a `bin/easy-mark.mjs` executable. Support `easy-mark serve <content-directory>` and `easy-mark export <content-directory> --pdf <file.pdf>`. Do not implement a static `build --out` command.

Treat the positional directory as an arbitrary content root containing Markdown and public assets. The repository's governance `doc/` directory is unrelated to this CLI example. Keep generated Markdown fragments in `mem-fs` for serve and export; the export command may write only the requested PDF file.

Keep `core/web/index.template.html` and `core/web/styles.template.css` as package-owned runtime templates. They are mapped to virtual `index.html` and `styles.css` in memory and cannot be overridden by content-root `index.html` or `styles.css`; those filenames are reserved and cause deterministic errors.

Keep optional `<content-directory>/manifest.json` metadata for title and logo. If present, valid manifest metadata has precedence over CLI flags. If absent, `--title` supplies the project title. If both are absent, the visible title falls back to `Easy Mark`. Package identity, binary name, and logs remain `easy-mark`.

Implement PDF export through a Playwright-compatible Chromium adapter loaded by the export command. The command serves the in-memory app on loopback, uses the same sanitized export snapshot and browser-side print assembly logic, applies print lifecycle styles, waits for local fonts and images, and writes the requested PDF path. If Playwright or Chromium is unavailable, report an actionable error instead of emitting an HTML fallback or raw stack trace.

This decision supersedes the user override portions of [ADR-0022](0022-core-server-web-and-user-overrides.md), refines [ADR-0024](0024-project-manifest-and-shell-title.md) and [ADR-0025](0025-project-logo-overlay-and-header-spacing.md) from `src/` to an arbitrary content directory, and refines [ADR-0014](0014-atomic-in-memory-pdf-export.md) by adding an explicit CLI PDF artifact while preserving in-memory HTML assembly.

## Consequences

- Consumers can run easy-mark against any Markdown directory without copying package templates.
- The package keeps one supported shell and stylesheet, making browser runtime hooks reliable.
- `manifest.json` remains a small public metadata surface and now cleanly coexists with CLI title fallback.
- PDF export becomes a real file-producing command but introduces Chromium availability as an operational dependency.
- The invariant against writing generated HTML to disk remains intact because no static HTML build command is introduced.

## Alternatives Considered

- Keep `src/index.html` and `src/styles.css` overrides: rejected because package consumers should not own runtime hook compatibility.
- Implement `easy-mark build --out`: rejected to preserve the no-generated-HTML-on-disk invariant.
- Use native print for CLI export: rejected because a CLI command needs a deterministic file artifact.
- Use a browser automation CLI as the production export dependency: rejected in favor of a direct Playwright-compatible API adapter that is easier to mock and test.
