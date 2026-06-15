---
name: pdf-export-verification
description: Verify easy-mark CLI packaging and PDF export behavior after changes to serve/export, Playwright integration, package metadata, print CSS, or PDF-related tests. Use explicitly when asked to validate PDF export, NPM packaging, or CLI smoke behavior.
---

# PDF Export Verification

Use this skill only for verification. Do not repair failures while acting as a verifier.

## Scope

Check that easy-mark remains distributable and that PDF export uses sanitized in-memory content without writing generated HTML to disk.

## Required Checks

1. Run targeted tests for CLI, PDF export runner, shell, app, and site builder.
2. Run `npm test`.
3. Run `npm pack --dry-run --json` and confirm the package includes:
   - `bin/easy-mark.mjs`
   - `core/server/`
   - `core/web/`
   - fonts and Ionicons assets under `core/web/`
   - `README.md`
4. Create a temporary content directory with at least one Markdown file and smoke `easy-mark serve` through the local bin when practical.
5. For real PDF smoke, run it only when Chromium is already available to Playwright. If Chromium is missing, report the skip and confirm the mocked PDF orchestration tests passed.

## PDF Assertions

When a real PDF smoke runs:

- the requested PDF file exists;
- the file starts with `%PDF`;
- the file size is greater than zero;
- no `.html` file is created next to the Markdown sources;
- errors do not expose raw HTML or stack traces to users.

## Boundaries

- Do not install browsers automatically during verification.
- Do not use `easy-mark build`; it is intentionally unsupported.
- Do not accept generated HTML output on disk as a workaround for PDF export.
