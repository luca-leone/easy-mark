# ADR-0016: Export Print Isolation and Asset Resolution

## Status

Accepted — 2026-06-09

## Context

The initial aggregate export CSS replaced the SPA for every print request, so ordinary Ctrl/Cmd+P could hide the current document and show an empty export container. Concatenated fragments also retained relative asset URLs whose browser base was the current SPA route rather than each Markdown source directory. Percent-encoded or canonically equivalent Unicode routes could miss the export namespace map, and the print container remained hidden from the accessibility tree while active.

## Decision

Apply aggregate print replacement only while `body.export-printing` is present. Include a source-relative asset base for every document in the atomic export payload, resolve same-origin fragment asset URLs against that base, and wait for image loading or decoding before invoking `window.print()`. Normalize decoded route pathnames to NFC both when building and querying the namespace map. Remove `aria-hidden` from the print container during active export and restore it during cleanup.

This decision refines the browser composition behavior introduced by [ADR-0014](0014-atomic-in-memory-pdf-export.md).

## Consequences

- Ordinary browser printing continues to print the currently visible SPA.
- Images and same-origin asset links from documents in different source directories resolve consistently in the aggregate export.
- Printing may wait for slow images, while broken images do not prevent the dialog from opening.
- Encoded and canonically equivalent Unicode document routes resolve to the same print target.
- Assistive technologies can observe the aggregate container only while it is active.
- The export payload now includes an `assetBase` field for each document.

## Alternatives Considered

- Always replace the SPA under `@media print`: rejected because the aggregate container exists only after an explicit export request.
- Resolve assets against canonical title routes: rejected because title-derived routes do not constitute authoritative source locations.
- Embed every asset as a data URL: rejected because it would increase payload size, duplicate binary data, and complicate CSP and memory use.
