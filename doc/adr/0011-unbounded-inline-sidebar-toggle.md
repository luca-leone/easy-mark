# ADR-0011: Unbounded Inline Sidebar Toggle

## Status

Accepted — 2026-06-08

## Context

ADR-0010 forced the sidebar visible above `1199px`. Landscape tablets, high-density devices, browser zoom, and wide split-screen viewports can cross that threshold while users still expect the visible hamburger control to collapse navigation. The width ceiling made the control ineffective in those cases.

## Decision

Use two sidebar modes only. Below `900px`, keep the modal drawer behavior. At every width of at least `900px`, show the hamburger and allow it to collapse or restore the in-layout sidebar. Persist the inline collapsed state under `documentation-sidebar-collapsed` without an upper-width exception.

## Consequences

- The hamburger works consistently in landscape and wide desktop viewports.
- Users can maximize reading width regardless of physical device classification.
- The controller requires one responsive media query instead of two.
- Wide screens no longer force persistent navigation.

## Alternatives Considered

- Raise the wide breakpoint: rejected because any fixed upper threshold can reproduce the same failure.
- Detect orientation: rejected because viewport width and user intent matter more than device orientation.
- Hide the hamburger on wide screens: rejected because it removes explicit user control.
