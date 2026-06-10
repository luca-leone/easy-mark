# ADR-0017: Canonical Route Precedence and Print Integrity

## Status

Accepted — 2026-06-08

## Context

Title-derived canonical routes and filename-derived compatibility aliases can collide. Resolving documents by the first matching canonical or alias made `/bar` dependent on document order when one document owned canonical `/bar` and another exposed `/bar` as its source alias. Aggregate export also inherited dark-theme custom properties and namespaced element IDs without updating sanitized ID-reference attributes.

## Decision

Allocate all canonical routes before compatibility aliases. Reserve every canonical base, assign deterministic suffixes to duplicate bases without consuming another reserved canonical route, and include an alias only when it collides with neither a canonical route nor an earlier accepted alias. Emit this resolved route table to the SPA and PDF snapshot; PDF map construction processes canonicals before aliases and never overwrites an existing target.

During export, build a per-document map from sanitized IDs to namespaced IDs and use it for fragment links and the IDREF attributes `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`, `headers`, and `for`, including token lists. Under `body.export-printing`, override the complete document palette and set `color-scheme: light` so output is independent of the active theme.

This decision refines [ADR-0007](0007-title-based-routes-and-exact-navigation-state.md), [ADR-0014](0014-atomic-in-memory-pdf-export.md), and [ADR-0016](0016-export-print-isolation-and-assets.md).

## Consequences

- Canonical routes always resolve to their owning document on the server, in the SPA manifest, and in PDF links.
- Some legacy filename aliases are intentionally omitted when retaining them would create ambiguity.
- Canonical suffixes remain stable and cannot shadow another document's unsuffixed title route.
- Accessible relationships and table headers remain valid after document concatenation.
- Exported pages use readable light colors even when the application is in dark mode.

## Alternatives Considered

- Let the first canonical-or-alias match win: rejected because aliases could shadow public canonical routes.
- Keep every alias and add request-time heuristics: rejected because server, SPA, and PDF could disagree.
- Preserve dark colors in print: rejected because browser background-print settings can make dark-theme output unreadable.
- Rewrite only element IDs and anchor fragments: rejected because IDREF attributes would point at nonexistent IDs.
