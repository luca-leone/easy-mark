# ADR-0024: Project Manifest and Shell Title

## Status

Accepted — 2026-06-10

## Context

The bundled shell and browser runtime displayed `easy-mark` as a hardcoded header and page-title suffix. Users could replace the entire HTML shell, but there was no small configuration surface for naming the documentation project without maintaining an override.

Project metadata originates in the user workspace and must update through the existing serialized live-reload pipeline without allowing malformed JSON or markup-like title values to corrupt the last valid virtual site.

## Decision

Use the optional public file `src/manifest.json` for project metadata. Initially support one required property when the file exists: `title`, a non-empty string normalized with `trim()`. Permit and ignore additional properties for future compatible extensions. Use `{ "title": "easy-mark" }` as the fallback when the file is absent or deleted.

Validate the manifest before mutating virtual files or project metadata. A malformed startup manifest prevents startup. A malformed watched update preserves the previous valid state and follows the existing failed-event behavior without browser reload.

Represent title insertion in the bundled shell with two `<!-- PROJECT_TITLE -->` placeholders. User-provided `src/index.html` overrides may omit or repeat this optional placeholder because they retain complete ownership of their static shell. Embed resolved metadata as JSON for the browser runtime, escaping `<`, and HTML-escape every title inserted into markup.

Format dynamic browser titles as `<document title> — <project title>`. Keep the package name, product identity, and startup log as `easy-mark`.

Logo metadata and asset overlay behavior are added by [ADR-0025](0025-project-logo-overlay-and-header-spacing.md).

## Consequences

- Users can name their documentation without copying the bundled HTML template.
- Header, initial browser title, and SPA navigation titles share one validated value.
- Manifest metadata is intentionally public and must not contain secrets.
- Existing HTML overrides remain valid without adopting the optional title placeholder.
- Invalid live edits cannot replace the last valid shell state.

## Alternatives Considered

- Derive the project title from the first Markdown H1: rejected because document identity and project identity are distinct.
- Require a custom `src/index.html`: rejected because a simple metadata change should not require maintaining the complete shell.
- Use environment variables: rejected because documentation configuration belongs with the portable authored source tree.
