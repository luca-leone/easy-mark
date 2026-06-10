# ADR-0014: Atomic In-Memory PDF Export

## Status

Accepted \u2014 2026-06-08

## Context

Users need one PDF containing the complete documentation, beginning with its navigation. Fetching fragments individually can mix revisions during live updates, while server-side PDF renderers add a browser runtime and would produce persisted output unless carefully managed.

## Decision

Expose `GET /__export` as a non-cacheable JSON snapshot assembled synchronously from the stable document list and sanitized HTML fragments already held in `mem-fs`. In the existing SPA shell, build a print-only container with navigation first and documents in stable path order. Namespace every document ID, rewrite internal links to the namespaced targets, and invoke the browser's native `window.print()` dialog. Never write aggregate HTML or PDF files to disk.

## Consequences

- One request observes one completed virtual build and cannot interleave with watcher event processing.
- The export reuses the same sanitized fragments served by the SPA without recompiling Markdown.
- Navigation and cross-document links remain usable in PDF viewers that preserve links.
- PDF rendering, paper selection, headers, footers, and destination filename remain browser responsibilities.
- Browsers that disable printing or PDF destinations cannot receive an automatic `.pdf` download.

## Alternatives Considered

- Fetch every `/__content` route in the browser: rejected because live updates could create a mixed-revision export.
- Generate PDF with headless Chromium on the server: rejected because it adds a large runtime dependency and operational complexity.
- Generate a standalone aggregate HTML page: rejected because `src/index.html` must remain the only application shell.
