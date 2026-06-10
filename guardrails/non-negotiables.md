# Non-Negotiable Guardrails

1. Generated document HTML must exist only in `mem-fs`; never emit it into `src/`, `dist/`, or another disk directory.
2. Preserve the complete relative structure of `src/` in the virtual filesystem.
3. Sanitize Markdown output before exposing it to the browser.
4. Reject virtual document paths that can traverse outside the virtual source root.
5. Keep the resolved virtual `index.html` as the only application shell and the resolved virtual `styles.css` as its global stylesheet; optional files in `src/` may override, but never merge with, the bundled templates.
6. Load document fragments into the shell on demand; do not create standalone generated pages.
7. Generate navigation before accepting HTTP traffic.
8. Keep path and watcher behavior OS agnostic.
9. Process source events serially and replace stale virtual content atomically at the editor abstraction level.
10. A behavior change is incomplete until its contract and regression coverage are updated.
11. Do not expose authored Markdown, HTML templates, or internal virtual paths through static-file handling.
12. Do not interpolate runtime error text into browser HTML.
13. Keep runtime font loading local; do not add external font stylesheets or font CDN dependencies.
14. Keep runtime icons local and use accessible button labels independently of decorative icon imagery.
15. Preserve keyboard operation, focus restoration, Escape dismissal, and scroll locking for the mobile navigation drawer.
16. Theme initialization must occur before first paint without weakening CSP through `unsafe-inline`.
17. Do not present estimated transcript token counts as authoritative Codex context capacity.
18. Do not automate `/compact`; preserve user control and prepare a durable handoff first.
19. Keep mirrored authored files and generated Markdown fragments in disjoint virtual roots so same-stem authored HTML can never replace sanitized document output.
20. Repository-authored commit messages must follow the Conventional Commit policy; generation must inspect staged semantics rather than infer intent from file paths alone.
21. Keep server application JavaScript under `core/server/`, bundled browser runtime and assets under `core/web/`, and user-authored content and overrides under `src/`.
