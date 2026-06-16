# ADR-0030: Remove Repository Demo Start Command

## Status

Superseded by ADR-0032 — 2026-06-16

## Context

After ADR-0029, the supported product interface is the `easy-mark` binary over an arbitrary content directory. The repository still kept a compatibility `npm run start` script, a hard-coded `core/server/server.js` entry point for `./src`, and a small `src/` demo tree.

That demo path made `src/` look like part of the package contract even though package consumers must provide their own content directory.

## Decision

Remove the repository-local `npm run start` compatibility script, delete the hard-coded `core/server/server.js` entry point, and remove the `src/` demo content directory.

Keep `node bin/easy-mark.mjs serve <content-directory>` as the development and package entry point. Keep package-owned browser runtime files under `core/web/` and reject content-root `index.html` and `styles.css` as reserved runtime paths.

This decision supersedes the repository-local `src/` and `core/server/server.js` entry point portions of [ADR-0004](0004-live-update-pipeline.md) and [ADR-0022](0022-core-server-web-and-user-overrides.md), and confirms the arbitrary content-directory model introduced by [ADR-0029](0029-npm-cli-content-directory-and-pdf-export.md).

## Consequences

- The repository no longer has a built-in demo content directory.
- Developers must pass an explicit content directory when serving local documentation.
- The package contract is clearer because `src/` no longer appears as a special runtime location.
- Tests and governance now assert that the public CLI, not a repository-specific start script, is the entry point.

## Alternatives Considered

- Keep `npm run start` as a convenience alias: rejected because it preserves the misleading `src/` special case.
- Keep `src/` as sample content without a script: rejected because README examples are enough and package consumers need their own content directory.
- Replace `npm run start` with another sample directory: rejected because the CLI already accepts any explicit directory.
