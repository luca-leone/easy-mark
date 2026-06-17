# Non-Negotiable Guardrails

1. Generated document HTML must exist only in `mem-fs`; never emit it into the content directory, `dist/`, or another disk directory.
2. Preserve the complete relative structure of the selected content directory in the virtual filesystem.
3. Sanitize Markdown output before exposing it to the browser.
4. Reject virtual document paths that can traverse outside the virtual source root.
5. Keep the resolved virtual `index.html` as the only application shell and the resolved virtual `styles.css` as its global stylesheet; content directories must not override package-owned `index.html` or `styles.css`.
6. Load document fragments into the shell on demand; do not create standalone generated pages.
7. Generate navigation before accepting HTTP traffic.
8. Keep path and watcher behavior OS agnostic.
9. Process source events serially and replace stale virtual content atomically at the editor abstraction level.
10. A behavior change is incomplete until its contract and regression coverage are updated.
11. Do not expose authored Markdown, HTML templates, or internal virtual paths through static-file handling.
12. Do not interpolate runtime error text into browser HTML.
13. Keep runtime font loading local; do not add external font stylesheets or font CDN dependencies.
14. Keep runtime interface icons local, use official Ionicons outline SVGs unless an ADR explicitly accepts an exception, and use accessible button labels independently of decorative icon imagery.
15. Preserve keyboard operation, focus restoration, Escape dismissal, and scroll locking for the mobile navigation drawer.
16. Theme initialization must occur before first paint without weakening CSP through `unsafe-inline`.
17. Do not present estimated transcript token counts as authoritative Codex context capacity.
18. Do not automate `/compact`; preserve user control and prepare a durable handoff first.
19. Keep mirrored authored files and generated Markdown fragments in disjoint virtual roots so same-stem authored HTML can never replace sanitized document output.
20. Repository-authored commit messages must follow the Conventional Commit policy; generation must inspect staged semantics rather than infer intent from file paths alone.
21. Keep server application JavaScript under `core/server/`, bundled browser runtime and assets under `core/web/`, the NPM executable under `bin/`, and user-authored content outside package-owned runtime files.
22. Derive document search text only from sanitized HAST text nodes after `rehypeSanitize`; never index raw Markdown, serialized HTML, attributes, URLs, comments, internal paths, or content removed by sanitization.
23. Preserve SPA routing, hierarchical navigation, Unicode-safe anchors, live reload, and regression coverage for fixed defects.
24. Keep every committed Markdown file at or below 150 lines; split content by scope instead of growing oversized Markdown files.
25. Keep machine-readable governance contracts under `contracts/governance/`; `rules/` explains how to apply them and does not own JSON contracts.
26. Keep versioned Git hook adapters under `hooks/git/` and install them through `core.hooksPath=hooks/git`; do not treat `.git/hooks` as repository source.
27. Treat `guardrails/` as the explicit invariant index for product, governance, hook, contract, and budget constraints.
28. Do not commit static third-party browser bundles under `core/web/vendor/`; serve peer package browser runtimes through allowlisted same-origin routes.
29. Do not run governed mutating work before `intake.started` and the required agent routing events are recorded in the agentic workflow ledger.
30. Compute version tags from the highest semver value across `package.json`, local tags, and remote tags; block package dry runs when the npm tarball version does not match that base.
