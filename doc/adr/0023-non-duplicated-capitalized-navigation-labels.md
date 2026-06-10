# ADR-0023: Non-Duplicated Capitalized Navigation Labels

## Status

Accepted — 2026-06-10

## Context

The first H1 of each Markdown document supplies the document title and canonical route. The navigation renderer also listed that same H1 as the first child heading, producing two adjacent links with the same meaning. Menu labels additionally preserved inconsistent author casing.

The rendered document, route, manifest, fragment IDs, and export lookup must retain their authored values and existing semantics.

## Decision

Keep the first H1 in compiled document metadata and rendered content, but omit that one heading from the child list in navigation. Later headings remain available, including any later H1 elements.

Apply Capitalized Case only while rendering navigation labels. Uppercase the first lowercase Unicode letter of each whitespace-delimited token and preserve every remaining character. This keeps existing acronyms and product spellings such as `API` and `Node.js` intact. Escape HTML after applying the presentation transformation.

Do not mutate compiled document metadata or use CSS `text-transform`; navigation text exposed to assistive technology and copied by users must match its visible presentation.

## Consequences

- Each document title appears once in the sidebar.
- Section links remain available without changing fragment targets.
- Navigation and PDF export navigation share the same label formatting.
- Authored Markdown, canonical routes, aliases, and manifests remain unchanged.

## Alternatives Considered

- Remove the first H1 during Markdown compilation: rejected because it would alter content and routing metadata.
- Hide the duplicate with CSS: rejected because duplicate semantics would remain in the accessibility tree.
- Lowercase every label before capitalizing it: rejected because it damages acronyms and intentional product capitalization.
