# ADR-0002: Markdown Conversion and Security

## Status

Accepted — 2026-06-08

## Context

Documentation needs modern Markdown features, stable navigation anchors, working cross-document links, and protection from executable raw HTML.

## Decision

Use Unified with CommonMark parsing and GFM extensions. Parse raw HTML, sanitize the resulting tree, generate deterministic `doc-`-prefixed heading IDs, and rewrite relative `.md` links to extensionless SPA routes while preserving fragments and queries.

## Consequences

- Tables, task lists, and GFM constructs are supported.
- Unsafe scripts and event handlers do not reach the browser.
- Heading IDs are suitable for menu links, including Unicode titles.
- Markdown authors can link between source documents naturally.

## Alternatives Considered

- Trust raw HTML: rejected because documentation content must not execute arbitrary browser code.
- Disable raw HTML completely: rejected because sanitized authored markup remains useful.
- Strict CommonMark only: rejected because expected documentation features include GFM.

