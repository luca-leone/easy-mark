# ADR-0031: Local Diagram and Chart Rendering

## Status

Accepted — 2026-06-16

## Context

Authors need diagrams and charts directly in Markdown without external services. The application already renders Markdown into sanitized fragments held in `mem-fs`, serves a same-origin browser runtime under a strict CSP, and exports an aggregate PDF from the same generated fragments.

Supporting visuals must preserve those invariants: no CDN dependency, no generated HTML on disk, no arbitrary JavaScript from authored Markdown, and no weakening of sanitization or CSP.

## Decision

Support `mermaid` fenced code blocks with the package-owned local Mermaid runtime, and support `chart` and `chartjs` fenced code blocks with the package-owned local Chart.js runtime.

Treat Chart.js blocks as JSON, not JavaScript. Accept the standard Chart.js configuration shape for supported chart types, with `donut` normalized to Chart.js `doughnut`. Reject invalid JSON, unknown chart types, prototype-pollution keys, and configurations without datasets at render time with text-only errors.

During Markdown compilation, replace supported fences with sanitized visual placeholders whose source is stored in attributes, not visible text. This keeps search text focused on document prose rather than Mermaid syntax or chart JSON. The browser runtime renders visuals after SPA navigation and before aggregate PDF printing. Mermaid is initialized with `startOnLoad: false`, `securityLevel: strict`, and `htmlLabels: false`. Chart animations are disabled so browser rendering and PDF output are deterministic.

Bundle Mermaid and Chart.js under `core/web/vendor/` with their licences so package consumers use same-origin assets and no CDN.

## Consequences

- Documentation authors can create Mermaid diagrams and Chart.js charts without additional setup.
- CSP remains same-origin and does not require `unsafe-inline`.
- Visual rendering becomes an asynchronous post-processing step after document fragments are inserted.
- PDF export must wait for visual rendering before waiting for images and printing.
- The package size increases because Mermaid and Chart.js browser bundles are included.

## Alternatives Considered

- Use CDN-hosted Mermaid and Chart.js: rejected because runtime assets must remain local and same-origin.
- Accept arbitrary JavaScript chart configuration: rejected because authored Markdown must not execute code.
- Parse YAML for Chart.js by default: rejected because Chart.js uses a JavaScript object configuration shape, and JSON is the safe interoperable subset.
- Implement chart drawing from scratch: rejected because chart rendering is a mature domain with established libraries.
