# ADR-0008: Local Google Sans and Typographic System

## Status

Accepted — 2026-06-08

## Context

The documentation interface used a generic system stack at a relatively small scale. The requested visual direction requires Google Sans, larger typography, and improved reading hierarchy without introducing runtime dependencies on external font services.

## Decision

Self-host the official Google Fonts variable WOFF2 subsets for Latin and Latin Extended under `src/fonts/google-sans/`. Declare them through `@font-face` in the global stylesheet with weights `400 700`, `font-display: swap`, and system fallbacks. Use an 18px desktop root size, responsive display headings, wider spacing, stronger navigation states, and refined code, table, and quotation treatments.

## Consequences

- Font rendering works offline and remains compatible with the same-origin CSP.
- Two optimized subset files add approximately 55 KB to source assets instead of several megabytes of static TTF weights.
- Non-Latin scripts outside the selected subsets use system fallbacks.
- All presentation remains centralized in `src/styles.css`.

## Alternatives Considered

- Load Google Fonts at runtime: rejected because it introduces external requests, privacy concerns, and CSP changes.
- Bundle four full TTF weights: rejected because the files total approximately 7.2 MB and variable WOFF2 subsets provide the required range more efficiently.
- Retain the system font stack: rejected because it does not satisfy the requested typography.
