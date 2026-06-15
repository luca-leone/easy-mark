# ADR-0028: Local Ionicons Outline Interface Icons

## Status

Accepted — 2026-06-15

## Context

The application already self-hosts a small set of Ionicons outline SVGs for controls introduced by responsive navigation, theme switching, and search. As the interface grows, icon choices need to remain consistent, local, accessible, and compatible with the existing CSP and no-runtime-library posture.

Search results also displayed decoded canonical routes as visible metadata. Route and alias matching remains useful for discovery, but showing route strings in every result adds visual noise and duplicates navigation internals that are not needed for selection.

## Decision

Use locally vendored official Ionicons outline SVGs for interface icons. Add new UI icons by extracting unchanged outline assets from the official Ionicons package into `core/web/icons/ionicons/`, updating the local notice, and referencing them through the existing CSS mask pattern. Do not load an icon CDN, web component, or runtime icon library. Any non-Ionicons interface icon requires a later ADR that explicitly accepts the exception.

Keep accessible button labels independent from decorative icon imagery. The theme toggle continues to expose the action through `aria-label`; its visible glyph uses the local `moon-outline.svg`, including in dark mode.

Search indexing and ranking continue to include decoded canonical routes and aliases. Search result items render only the document title and optional sanitized-text snippet; they no longer print canonical routes or aliases to the visible result list. Result selection still navigates to the canonical route.

Use the uncircled local `close-outline.svg` for the search clear control, sized larger inside the existing circular button target. This refines the `close-circle-outline.svg` choice recorded in [ADR-0027](0027-sanitized-full-text-document-search.md).

This decision refines [ADR-0009](0009-responsive-controls-theme-and-reading-progress.md) and [ADR-0027](0027-sanitized-full-text-document-search.md).

## Consequences

- Interface iconography remains visually consistent without external requests or runtime icon dependencies.
- Future icon additions have a single documented source and exception path.
- The dark theme toggle keeps a visible moon glyph while the accessible label remains the source of action semantics.
- The search clear action reads as a plain larger X while preserving the existing accessible label and hit target.
- Search result rows are quieter while route and alias queries continue to find and navigate to the right document.

## Alternatives Considered

- Allow any local SVG icon: rejected because mixed icon families make the interface inconsistent and weaken the established source-of-truth pattern.
- Load Ionicons through a CDN or component package: rejected because it adds external/runtime dependency surface for a small static icon set.
- Keep visible routes in search results: rejected because users asked not to print result routes and canonical navigation already happens on selection.
