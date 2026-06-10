# ADR-0001: In-Memory Build Architecture

## Status

Superseded by ADR-0015 — 2026-06-09

## Context

The application must present Markdown as HTML without creating generated HTML files on disk. Assets and generated fragments must preserve the source directory structure across operating systems.

## Decision

Copy `src/**/*` into a `mem-fs` store before server startup. For every Markdown file, add a same-path `.html` fragment to that store. Serve shell, fragments, and copied assets directly from the virtual filesystem. Use real filesystem paths only to read authored source files.

This storage layout is superseded by [ADR-0015](0015-disjoint-virtual-fragment-storage.md), which separates generated fragments from the authored mirror to prevent same-path collisions.

## Consequences

- Generated pages leave no disk artifacts.
- Server availability depends on a successful initial virtual build.
- Tests must inspect both the virtual store and the real filesystem.
- Filesystem and URL path normalization remain separate concerns.

## Alternatives Considered

- Write a conventional `dist/` directory: rejected because it violates the no-generated-HTML-on-disk requirement.
- Convert Markdown per HTTP request: rejected because navigation and startup validation require a coherent prebuilt document index.
