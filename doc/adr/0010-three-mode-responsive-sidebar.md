# ADR-0010: Three-Mode Responsive Sidebar

## Status

Superseded by ADR-0011 — 2026-06-08

## Context

Tablet landscape, split-screen windows, and smaller laptops can exceed the mobile breakpoint while still having insufficient width for a permanently visible documentation sidebar. Orientation-specific rules would not cover resized desktop windows or split-screen layouts consistently.

## Decision

Use three width-based sidebar modes. Below `900px`, retain the modal drawer with backdrop, focus containment, Escape handling, and scroll locking. From `900px` through `1199px`, keep the sidebar in the grid but allow the hamburger to collapse it, persist that preference under `documentation-sidebar-collapsed`, and avoid modal behavior. At `1200px` and above, force the sidebar visible and hide the hamburger. Breakpoint changes close transient drawer state while retaining the compact preference for later restoration.

## Consequences

- Landscape tablets and constrained desktop windows can dedicate the full width to content.
- Mobile accessibility behavior remains isolated to the true drawer mode.
- Wide desktops retain persistent navigation regardless of the stored compact preference.
- Sidebar state now depends on two media queries and one persisted compact preference.

## Alternatives Considered

- Detect landscape orientation: rejected because orientation does not describe available application width.
- Make the sidebar collapsible at every desktop width: rejected because wide documentation layouts benefit from persistent context.
- Use one mobile breakpoint only: rejected because medium-width screens remain unnecessarily constrained.
