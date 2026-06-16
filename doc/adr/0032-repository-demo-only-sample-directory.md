# ADR-0032: Repository-Only Demo Sample Directory

## Status

Accepted — 2026-06-16

## Context

The published package is a public CLI over arbitrary content directories. The repository still needs a concrete demo that showcases the supported Mermaid and Chart.js rendering features, but that sample must help contributors and reviewers without becoming part of the npm tarball or implying a package-owned runtime location.

## Decision

Keep the example content in a top-level `demo/` directory in the repository, and keep it out of the published package by omitting it from `package.files`.

Use the demo as a repository-only sample for local development, README examples, and release validation. The demo can include Markdown prose, Mermaid fences, Chart.js fences, and optional public metadata such as `manifest.json`, but it remains a checked-in example rather than a distributed package asset.

This decision supersedes the demo-removal portion of [ADR-0030](0030-remove-repository-demo-start.md) while preserving the public CLI contract introduced by [ADR-0029](0029-npm-cli-content-directory-and-pdf-export.md).

## Consequences

- Contributors have a ready-made sample for `node bin/easy-mark.mjs serve ./demo`.
- The npm tarball stays focused on the CLI runtime, bundled browser assets, and README.
- The repository can demonstrate Mermaid and Chart.js visuals without reinstating `src/` as a special runtime directory.
- Packaging tests need to assert that `demo/` stays out of `package.files`.

## Alternatives Considered

- Put the demo in the README only: rejected because a real directory is more useful for running the CLI.
- Publish the demo with the package: rejected because it adds non-runtime content to the npm tarball.
- Reintroduce `src/` as the sample directory: rejected because it conflicts with the explicit public content-directory model.
