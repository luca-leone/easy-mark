# ADR-0007: Title-Based Routes and Exact Navigation State

## Status

Accepted — 2026-06-08

## Context

Menu links are user-facing navigation labels, but canonical routes still exposed implementation filenames such as `/README`. Active-link state also matched only the route pathname, causing every heading link under the selected document to appear active at once.

## Decision

Derive each canonical document route from the first H1 used as the parent menu label, preserving the source subdirectory and keeping the original extensionless file route as an alias. Resolve aliases to the canonical route in the browser and content server. Compute menu state with route plus fragment: the parent document link is active only without a fragment, and a heading link is active only when its exact fragment is selected.

## Consequences

- The root README titled `Introduzione` appears as `/introduzione` in the address bar.
- Legacy direct routes such as `/README` still resolve and are normalized client-side.
- Heading links no longer appear active unless their anchor was selected.
- Duplicate title routes require deterministic suffixes within the generated route set.

## Alternatives Considered

- Keep filename-based routes: rejected because menu labels and address-bar semantics diverge for authored landing pages.
- Activate parent and all child anchors by pathname: rejected because it gives a false navigation state.
- Remove alias support: rejected because Markdown link rewriting and existing direct links need compatibility.
