# ADR-0003: SPA Shell, Routing, and Navigation

## Status

Accepted — 2026-06-08

## Context

The authored `index.html` must be the only page shell and stylesheet owner. Documents must load on demand while retaining direct URLs and a menu derived from all headings before startup.

## Decision

Use extensionless History API routes. Serve the shell for browser document routes and expose generated fragments through `/__content/<route>`. Generate navigation from documents ordered by path, label each document with its first H1, and nest all headings beneath it. Resolve URL fragments by decoding them and using `getElementById` rather than CSS selectors.

This ADR is refined by [ADR-0007](0007-title-based-routes-and-exact-navigation-state.md), which makes title-derived routes canonical and filename routes aliases.

Menu label presentation and omission of the duplicated title heading are refined by [ADR-0023](0023-non-duplicated-capitalized-navigation-labels.md).

## Consequences

- Direct links remain readable and reloadable.
- The shell and global stylesheet are loaded once.
- Navigation metadata must be regenerated when documents or headings change.
- Unicode fragments avoid invalid-selector failures.

## Alternatives Considered

- Hash routing: rejected in favor of clean document URLs.
- Standalone generated HTML pages: rejected because they duplicate the shell and stylesheet ownership.
- CSS-selector anchor lookup: rejected because percent-encoded Unicode fragments may not be valid selectors.
