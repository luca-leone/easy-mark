# ADR-0022: Core Server, Web Templates, and User Overrides

## Status

Accepted — 2026-06-10

## Context

Server business logic lived under `lib/`, while browser application code, bundled assets, templates, and user-authored Markdown all shared `src/`. This mixed product internals with the user's content workspace and made the bundled shell indistinguishable from a user customization.

The application needs stable built-in HTML and CSS defaults while allowing users to replace either file from `src/` without modifying application-owned files.

## Decision

Place all server application JavaScript under `core/server/`, with `core/server/server.js` as the entry point. Place bundled browser JavaScript, static assets, and base templates under `core/web/`. Keep `src/` as the user workspace for Markdown, user assets, and optional shell and stylesheet overrides.

Name the bundled shell and stylesheet `core/web/index.template.html` and `core/web/styles.template.css`. During an in-memory build, map them to virtual `index.html` and `styles.css`, then overlay the complete `src/` tree. A same-path file from `src/` therefore has priority. When a watched override is deleted, restore the corresponding bundled file in memory.

Require a user-provided `src/index.html` to contain exactly one `<!-- NAVIGATION -->` placeholder and one `<!-- DOCUMENT_MANIFEST -->` placeholder. The override remains responsible for preserving any DOM hooks, scripts, and stylesheet reference needed by the bundled browser runtime.

## Consequences

- Application-owned code and assets have explicit server and browser ownership boundaries.
- A valid Markdown-only `src/` starts with the bundled shell and stylesheet.
- Users can replace HTML or CSS without editing `core/`.
- Template filenames are internal and are never exposed as public asset paths.
- The watcher only needs to observe user changes under `src/`; product template changes require a restart.

## Alternatives Considered

- Keep bundled browser files in `src/`: rejected because application internals and user content remain mixed.
- Merge user HTML or CSS into the defaults: rejected because merge semantics would be ambiguous and difficult to validate deterministically.
- Require users to copy templates before first startup: rejected because a Markdown-only workspace should use functional defaults immediately.
