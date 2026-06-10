# ADR-0018: Normalized URL Route Space

## Status

Accepted — 2026-06-08

## Context

Routes previously mixed raw filesystem and title strings with URL pathnames. Canonically equivalent NFC and NFD titles could be considered distinct by the builder but identical by PDF lookup. Directory names containing `#`, `?`, `%`, spaces, or Unicode could also change URL pathname semantics or be encoded repeatedly by different layers.

## Decision

Use one dependency-free browser-compatible route module for Markdown compilation, canonical and alias allocation, server lookup, SPA matching, navigation, and PDF lookup. Construct authored routes from decoded path segments, normalize every segment to NFC, and apply `encodeURIComponent` exactly once per segment. Normalize incoming encoded pathnames by decoding each segment, applying NFC, and re-encoding it. Use that serialized form as the collision key for canonical routes and aliases.

Continue applying GitHub-style slugging to title-derived segments before URL serialization. Percent-encode navigation fragment IDs independently from route pathnames. Browsers remain free to present encoded Unicode routes in readable decoded form in the address bar.

This decision refines [ADR-0007](0007-title-based-routes-and-exact-navigation-state.md) and [ADR-0017](0017-canonical-route-precedence-and-print-integrity.md).

## Consequences

- NFC and NFD spellings share one collision domain and receive deterministic suffixes.
- Reserved characters in source directories and filename aliases cannot become query or fragment delimiters.
- Manifest, navigation, server, SPA, and PDF use identical serialized route values.
- Already serialized routes normalize idempotently instead of being double encoded.
- Malformed percent escapes are rejected or ignored by the lookup boundary rather than interpreted ambiguously.
- Title punctuation removed by the established slugger does not reappear during serialization.

## Alternatives Considered

- Store raw Unicode route strings and encode only while rendering links: rejected because collision and lookup layers could disagree.
- Normalize only in PDF export: rejected because server and SPA would retain ambiguous route ownership.
- Encode complete path strings with one `encodeURIComponent` call: rejected because path separators would be encoded and hierarchy lost.
- Preserve literal title punctuation instead of slugging: rejected because it would change the established title-route contract beyond this routing correction.
