# ADR-0037: Peer Resolved Visual Runtimes

## Status

Accepted

## Context

The NPM package distributed Mermaid and Chart.js twice: as declared packages and as static browser bundles under `core/web/vendor/`. That layout increased tarball size, duplicated third-party code, and made the committed runtime asset tree look like package source.

The visual runtime still needs strict CSP, same-origin loading, no CDN, no authored JavaScript execution, and deterministic browser/PDF rendering.

## Decision

Declare `mermaid` and `chart.js` as peer dependencies and development dependencies. Do not keep their browser bundles under `core/web/vendor/`.

Keep the existing browser URLs:

- `/vendor/mermaid/mermaid.min.js`
- `/vendor/chart.js/chart.umd.min.js`

Serve those URLs from an explicit server allowlist that resolves the installed peer packages at runtime. The server must return the selected package asset only for those known paths. Other package files remain unreachable.

Keep server-side Markdown parsing, sanitization, and Chart.js JSON validation unchanged.

## Consequences

The published package stops carrying static Mermaid and Chart.js bundles. Consumers control compatible peer versions through normal package management. The browser still receives same-origin scripts and no CDN access is introduced.

Package consumers need `mermaid` and `chart.js` installed for visual rendering. Development keeps them in `devDependencies` so tests and local serving remain deterministic.

## Alternatives Considered

- Keep static bundles under `core/web/vendor/`: rejected because it duplicates third-party code inside a distributable package.
- Load Mermaid and Chart.js from a CDN: rejected because runtime assets must stay same-origin under the existing CSP.
- Bundle only one combined visual runtime file: rejected because it still commits third-party browser code into the package source.
