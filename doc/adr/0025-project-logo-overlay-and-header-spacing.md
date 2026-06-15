# ADR-0025: Project Logo Overlay and Header Spacing

## Status

Accepted — 2026-06-10

## Context

The hamburger icon was visually translated toward the sidebar gutter without moving the following brand in layout, creating excessive apparent whitespace before the header title. Project metadata supported a title but no optional visual identity.

Users need a bundled logo that works out of the box, the ability to replace it with an authored asset, and safe manifest paths that cannot escape the public virtual asset space.

## Decision

Extend `src/manifest.json` with optional `logo`, accepting `null` or a validated root-relative image pathname. Restrict formats to SVG, PNG, JPEG, GIF, WebP, and ICO; reject external URLs, traversal, reserved internal namespaces, query strings, fragments, backslashes, control characters, and malformed percent encoding.

Provide `core/web/logo.svg` and configure it as `/logo.svg` in the example manifest. Continue building bundled web files before authored `src/` files, so `src/logo.svg` replaces the bundled same-path asset in memory and deletion restores the bundled file. Render a decorative `<img>` only when the configured virtual asset exists.

Add an optional `<!-- PROJECT_LOGO -->` shell placeholder. Place it inside the brand link before the project title. Keep the title as the accessible name and use empty alternative text for the decorative image.

Replace the hamburger's visual-only translation with a layout-participating inline margin, and halve the header element gap from `0.65rem` to `0.325rem`. Preserve the existing button target size.

## Consequences

- The hamburger-to-brand distance is substantially reduced without shrinking the control.
- Projects can use the bundled logo, override it at the same path, choose another local asset, or disable it.
- Missing configured assets do not produce broken images and become visible automatically when later added.
- Logo metadata remains public and cannot reference external or internal endpoint URLs.

## Alternatives Considered

- Inline SVG from the manifest: rejected because it would introduce markup injection and sanitization concerns.
- Store logos outside `src/`: rejected because user assets should remain portable with authored documentation.
- Keep the CSS transform and compensate with negative brand margins: rejected because independent visual offsets make layout spacing brittle.
