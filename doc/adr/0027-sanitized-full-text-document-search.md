# ADR-0027: Sanitized Full-Text Document Search

## Status

Accepted — 2026-06-11

## Context

[ADR-0026](0026-client-side-document-search.md) limited client-side search to titles and routes so the embedded document manifest did not contain document bodies. Users also need to find words that occur only in document content. Adding raw Markdown, rendered HTML, internal paths, or an unsanitized parallel extraction path would expose data outside the established Markdown security boundary and could make dangerous removed content searchable.

Full-text results also need enough context to be useful without changing the fragment endpoint or loading every document at query time. The existing readonly launcher and editable overlay input require explicit draft and committed states so typing does not mutate the closed-shell state prematurely.

## Decision

Extract each document's search text from HAST after `rehypeSanitize` and before stringification. Collect only sanitized text nodes, add deterministic separators for visible block, table-cell, and line-break boundaries, and collapse whitespace. Do not index attributes, URLs, comments, source paths, raw Markdown, serialized HTML, or content removed by sanitization. Return the extracted value from `compileMarkdown` and embed it as `text` in the deterministic public document manifest `{ route, aliases, title, text }`.

Keep search dependency-free and client-side. Normalize query and indexed values with trim, NFKD, combining-mark removal, lowercase conversion, and collapsed whitespace. Deduplicate query tokens, require every token to occur somewhere in the union of title, canonical route, aliases, and body, and do not add fuzzy matching, stemming, or frequency scoring.

Rank matches in this order: exact title, title prefix, title-word prefix, all tokens in title, all tokens in the canonical route, all tokens in one alias, full normalized phrase in the body, all tokens in the body, then mixed fields. Preserve manifest order for ties. Return result descriptors containing the document, rank, match source, and an optional snippet.

Generate a body snippet only when body text is required for eligibility or rank. Use the original sanitized search text, prefer the full query phrase and otherwise the first matching token in query order, cap output at 180 Unicode code points including side-specific ellipses, target 60 code points before the match, reallocate unused space, and prefer whitespace boundaries without dropping the match. Render every result field through `textContent`.

Treat the overlay input as draft state and the launcher value as committed state. Typing updates results, snippets, empty state, and the clear control without changing the launcher. Every dismissal path, including result selection and programmatic `close()`, commits the draft; result selection still navigates canonically without focus restoration. Reopening starts from the committed value.

Add an atomic `search-clear` button hook using the unchanged local Ionicons 8.0.13 `close-circle-outline.svg`. It is visible only for a non-empty draft, clears through native button activation, keeps the overlay open, restores all results, and focuses the input. Suppress the native WebKit search cancel control. Incomplete shell overrides remain neutralized through the existing narrowly scoped launcher-container logic.

This decision supersedes [ADR-0026](0026-client-side-document-search.md). It does not add an endpoint, disk output, dependency, CSP change, or PDF export field.

## Consequences

- Search can discover sanitized visible content, including code, tables, link text, and allowed raw HTML.
- The shell contains a compact plain-text index, so its size grows with authored visible content.
- Removed dangerous content and non-text internals cannot influence matching or snippets.
- Matching, ranking, snippets, and live rebuilds remain deterministic.
- Shell overrides that adopted ADR-0026 search markup must add `search-clear` before search initializes again.
- PDF export and on-demand fragment delivery retain their existing contracts.

## Alternatives Considered

- Index raw Markdown or rendered HTML: rejected because either format exposes non-visible syntax, attributes, URLs, or unsafe pre-sanitization content.
- Fetch every fragment when search opens: rejected because it adds asynchronous query-time loading and duplicates content already available during the build.
- Add a server search endpoint: rejected because deterministic local search does not require a new HTTP or CSP surface.
- Highlight matches with HTML: rejected because plain `textContent` snippets satisfy context needs without adding an injection-sensitive rendering path.
