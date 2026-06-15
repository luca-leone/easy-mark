# ADR-0026: Client-Side Document Search

## Status

Superseded by [ADR-0027](0027-sanitized-full-text-document-search.md) — 2026-06-11

## Context

The application already embeds a deterministic document manifest containing canonical routes, compatibility aliases, and titles. Users need fast document discovery without adding a server endpoint, exposing authored Markdown, downloading every rendered fragment, or expanding the manifest into a full-text index.

The bundled shell also supports complete user overrides. Existing overrides must continue to run when they do not adopt new search markup, while partial markup must not create a broken or inaccessible interaction.

## Decision

Build a dependency-free client-side search index from `{ route, aliases, title }`. Decode route values for matching and display, normalize queries with trim, NFKD, combining-mark removal, lowercase conversion, and collapsed whitespace, and require every query token to occur in one candidate field. Do not use fuzzy matching, document body text, headings, or a search HTTP endpoint.

Rank matches by exact title, title prefix, title-word prefix, title substring, canonical route, and alias, retaining manifest order as the final tie-breaker. Display title plus canonical route and always navigate to the canonical route.

Use a readonly search input as the compact header launcher because focus is itself the specified opening action and the field must mirror the active query. Keep editing in a larger dialog input. Suppress launcher focus handling during focus restoration so closing the dialog cannot reopen it.

Expose the overlay as an accessible modal dialog with a combobox, listbox, keyboard result selection, Escape and backdrop dismissal, focus containment and restoration, and body scroll locking. Close an open mobile drawer before showing search. On result selection, close without restoring focus and allow the SPA render lifecycle to focus document content.

Initialize the controller atomically only when every search hook exists. Hide an incomplete launcher and overlay before returning so old full-shell overrides continue without search and partial adoption cannot leave a dead control. Create result nodes through DOM APIs and assign user-derived values through `textContent`.

Keep the search module and search icon under `core/web/`. Vendor the unchanged `search-outline.svg` from the same local official Ionicons 8.0.13 package as the existing icons.

## Consequences

- Search adds no server route, persisted index, external dependency, or access to document body content.
- Matching and ordering remain deterministic across rebuilds because manifest order is the final tie-breaker.
- Accented and decomposed Unicode text can match unaccented queries, while the displayed metadata remains unchanged.
- Existing shell overrides continue without search until they adopt the complete hook set; incomplete visible hooks are neutralized and hidden.
- Search quality is intentionally limited to document-level metadata; body text and headings are outside scope.

## Alternatives Considered

- Server-side or full-text search: rejected because the manifest already satisfies document discovery without a new endpoint or body index.
- Fuzzy matching: rejected because it weakens predictability and requires additional scoring rules or dependencies.
- An input-like button launcher: rejected because the launcher must mirror the query and focusing the field is an explicit opening action; the readonly input preserves those semantics with guarded focus restoration.
- Partial enhancement of whichever hooks exist: rejected because it can leave visible controls without a complete accessible interaction.
