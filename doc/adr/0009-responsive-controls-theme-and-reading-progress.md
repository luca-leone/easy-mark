# ADR-0009: Responsive Controls, Theme, and Reading Progress

## Status

Accepted — 2026-06-08

## Context

The fixed navigation consumes too much space on small screens, the interface offers only a light palette, and long documents provide no indication of reading position. New controls require consistent icons without adding external runtime dependencies or weakening accessibility and CSP.

## Decision

Keep the sidebar permanently visible from `900px` upward and convert it to a hamburger-driven drawer below that breakpoint. The drawer uses backdrop and close controls, Escape dismissal, focus containment and restoration, navigation-close behavior, and body scroll locking. Add a light/dark toggle that initializes before CSS from persisted preference or the operating-system preference. Add a three-pixel document-relative progress bar below the sticky header. Self-host only the required Ionicons outline SVGs from the official package with its MIT license.

The desktop visibility rule is refined by [ADR-0010](0010-three-mode-responsive-sidebar.md), which introduces a collapsible compact range from `900px` through `1199px`.

## Consequences

- Mobile content receives the full viewport width while navigation remains quickly accessible.
- Theme changes persist across visits without a first-paint flash or external requests.
- Reading position is visible without adding textual header clutter.
- Browser behavior is split into focused sidebar, theme, and progress modules with pure functions available for tests.
- Four SVG assets and an Ionicons license file become durable source assets.

## Alternatives Considered

- Collapse the sidebar on desktop: rejected because desktop documentation benefits from persistent context.
- Use a three-state theme selector: rejected in favor of a simpler system-default plus persistent explicit toggle.
- Use a textual percentage: rejected because a thin progress bar is less visually intrusive.
- Load Ionicons as a web component or CDN dependency: rejected because only four local outline SVGs are required.
