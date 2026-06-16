# ADR-0015: Disjoint Virtual Fragment Storage

## Status

Accepted — 2026-06-09

## Context

ADR-0001 placed a generated `page.md` fragment at the same virtual `page.html` path used to mirror an authored `page.html`. Initial scan order and watcher events could therefore replace sanitized output with authored HTML, or delete the generated fragment when only the authored file was removed. Case-insensitive path comparison also lacked a deterministic tie-breaker for distinct paths that differ only by case.

## Decision

Keep the complete authored `src/` mirror under its existing virtual root and place generated Markdown fragments under a separate generated-only root in the same `mem-fs` store. Access generated fragments through a dedicated reader used by document routing and export; static asset handling continues to read only the authored mirror and continues to block authored HTML. Sort documents case-insensitively first, then compare exact path strings as a deterministic total-order tie-breaker.

This decision supersedes the same-path generated fragment layout in [ADR-0001](0001-in-memory-build-architecture.md) and preserves the export architecture in [ADR-0014](0014-atomic-in-memory-pdf-export.md).

## Consequences

- Same-stem Markdown and authored HTML cannot overwrite or delete each other's virtual content.
- Document serving and PDF export can only read generated, sanitized fragments.
- The authored mirror retains its complete relative structure without making HTML templates public.
- Route suffix assignment and navigation order remain deterministic when paths differ only by case.
- Internal code must select the authored or generated virtual reader explicitly.

## Alternatives Considered

- Reserve a directory name inside the authored virtual root: rejected because authored source could use the same directory name.
- Reject same-stem authored HTML: rejected because source mirroring must preserve valid authored files without creating a security dependency on filename policy.
- Depend on scan or watcher ordering: rejected because it is nondeterministic and can expose unsanitized content.
