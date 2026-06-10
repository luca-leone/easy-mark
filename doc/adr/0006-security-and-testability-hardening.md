# ADR-0006: Security and Testability Hardening

## Status

Accepted — 2026-06-08

## Context

The initial implementation served any virtual file by path, generated nested navigation through fragile string-state logic, and kept event serialization embedded in the executable server. These choices made authored sources unnecessarily reachable and important behavior difficult to test directly.

## Decision

Restrict static serving to an explicit browser-asset extension allowlist and reject authored Markdown and HTML templates. Add same-origin security headers and render browser error messages through DOM text APIs. Generate heading navigation recursively from heading depth rather than tracking open tags manually. Extract serialized file-event handling into a reusable module and target Node.js 22 explicitly.

## Consequences

- Source Markdown and templates are no longer public static resources.
- HTTP clients receive CSP, MIME-sniffing, and referrer protections.
- Navigation remains balanced when heading levels are skipped or reduced.
- Event ordering, recovery, and reload timing are directly testable.
- Contributors need Node.js 22 for the supported development environment.

## Alternatives Considered

- Continue serving every virtual file: rejected because mirroring into memory does not imply public accessibility.
- Add a full static-server dependency: rejected because the required allowlist is small and explicit.
- Keep watcher orchestration in `server.js`: rejected because serialization and failure recovery are core behavior requiring isolated tests.
