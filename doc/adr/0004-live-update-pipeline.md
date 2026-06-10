# ADR-0004: Live Update Pipeline

## Status

Accepted — 2026-06-08

## Context

Changes under `src/` must update the in-memory site and browser without restarting the process or writing build output to disk.

## Decision

Watch `src/` with Chokidar after the initial build. Process events through a promise queue, update or remove affected virtual files, regenerate Markdown fragments and shell metadata as needed, then publish an SSE reload event from `/__events`.

## Consequences

- Rapid filesystem events cannot mutate the virtual site concurrently.
- Browsers receive simple, dependency-free reload notifications.
- A reload keeps a valid route and falls back when a route was removed.
- Failed updates are logged without silently corrupting completed virtual state.

## Alternatives Considered

- Restart the HTTP server after each change: rejected because it introduces unnecessary downtime and lifecycle complexity.
- WebSockets: rejected because one-way reload notifications only require SSE.
- Polling in the browser: rejected because filesystem events already provide an efficient trigger.

