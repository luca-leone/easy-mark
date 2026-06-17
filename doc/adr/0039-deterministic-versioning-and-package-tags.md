# ADR-0039: Deterministic Versioning And Package Tags

## Status

Accepted - 2026-06-17

## Context

Task-finalization tags previously used package metadata and local Git tags. That avoided local collisions but missed remote tags, so a clone behind origin could propose a duplicate or lower tag. NPM tarball names also come from `package.json`, so `npm pack` can produce a file whose version is behind the current release tag base.

## Decision

Add `contracts/governance/versioning.json` as the machine-readable versioning contract. The version base is the highest semver value across `package.json`, local `vMAJOR.MINOR.PATCH` tags, and remote `vMAJOR.MINOR.PATCH` tags from origin.

Move semver parsing, tag proposal, remote tag reading, and pack-version validation into `script/versioning-runtime.mjs`. `npm run task:commit` uses that runtime before proposing or creating a local tag, and every created tag includes the exact `git push origin <tag>` command.

Add `npm run pack:dry-run` as the governed packaging entry point. It validates that `package.version` equals the highest semver tag base before invoking `npm pack --dry-run`; otherwise it fails before npm creates a misleading tarball name.

## Consequences

- Tag proposals are deterministic across clones that can read origin.
- Remote tag collisions are detected before local tag creation.
- Package dry runs stop when the tarball name would lag behind the tag base.
- Push remains a human-controlled command.

## Alternatives Considered

- Use only local tags: rejected because a stale clone can miss remote releases.
- Rename the `.tgz` after `npm pack`: rejected because the package metadata inside the tarball would still contain the old version.
- Run `npm version` automatically: rejected because package mutation remains a release decision.
