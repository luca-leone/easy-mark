# Application Contract

## Startup

- The application supports Node.js 22 and later; Node.js 22 remains the development and verification baseline.
- The product name and startup log remain `easy-mark`; the published package name is `@easy-mark/cli`, the binary name is `easy-mark`, and the default visible documentation title is `Easy Mark`.
- `easy-mark serve <content-directory>` builds and serves the documentation from an arbitrary user-selected content directory.
- `easy-mark export <content-directory> --pdf <file.pdf>` builds the documentation in memory and writes the requested PDF file.
- The default HTTP port is `3000`; `PORT` may override it and the CLI may pass an explicit port. The bundled `/logo.svg` is the default project logo.
- Startup fails when either bundled template under `core/web/` is missing, when the content directory contains root `index.html` or `styles.css`, when a present `manifest.json` is invalid, or when all Markdown documents are missing.
- The server starts only after the initial virtual build and navigation generation complete.

## Virtual Build

- Browser runtime files and static assets under `core/web/` are copied into `mem-fs`; `index.template.html` and `styles.template.css` are exposed there as `index.html` and `styles.css` without exposing their `.template` names.
- Every real file under the content directory is then copied into `mem-fs` with its relative structure preserved, except root `index.html` and `styles.css`, which are reserved package-owned runtime files and are rejected.
- Each `**/*.md` file in the content directory additionally produces a corresponding `.html` fragment under a generated-only `mem-fs` root that is disjoint from the mirrored authored paths.
- An authored `.html` file may coexist with the generated fragment for a same-stem Markdown file without replacing it or being exposed as document content.
- Converted HTML fragments are never written to the real filesystem.
- The resolved virtual `index.html` is the sole application shell and the resolved virtual `styles.css` is the sole global stylesheet.
- Content directories cannot customize the application shell or global stylesheet by supplying root `index.html` or `styles.css`.
- The bundled shell contains exactly one `<!-- NAVIGATION -->` placeholder, one `<!-- DOCUMENT_MANIFEST -->` placeholder, exactly two `<!-- PROJECT_TITLE -->` placeholders, and one `<!-- PROJECT_LOGO -->` placeholder. These placeholders are replaced in memory.

## Project Metadata

- `manifest.json` in the content directory is optional public configuration. When present and valid, its metadata has precedence over CLI title flags. When absent or deleted, the CLI `--title` value is used if provided; otherwise the project title defaults to `Easy Mark`.
- When present, the manifest must be valid JSON with an object root. If `title` is present it must be a non-empty string and surrounding whitespace is removed.
- The optional `logo` property is either `null` or a safe root-relative pathname using SVG, PNG, JPEG, GIF, WebP, or ICO. External URLs, traversal, reserved namespaces, query strings, fragments, backslashes, malformed encoding, and unsupported extensions are rejected.
- The project title is rendered in the bundled header and initial `<title>`, and browser navigation formats dynamic titles as `<document title> — <project title>`.
- A configured logo is rendered decoratively between the hamburger and project title only when its virtual asset exists. `/logo.svg` resolves to the bundled default; an authored same-path asset in the content directory overrides the bundled file through normal virtual overlay precedence, and deletion restores the bundled asset when available.
- The resolved metadata is embedded as escaped JSON in a `project-manifest` script element for the browser runtime. Values containing `<` cannot terminate the script or inject markup.
- Invalid manifest updates preserve the last valid virtual state, emit no reload event, and do not prevent later file events from being processed.

## Typography and Presentation

- Google Sans is self-hosted from variable WOFF2 Latin and Latin Extended subsets under `core/web/fonts/google-sans/`; runtime rendering makes no external font requests.
- The base desktop font size is `18px`, with responsive document headings and a larger reading scale than browser defaults.
- The default visual system is defined only in `core/web/styles.template.css`; content directories cannot replace it with a root stylesheet override.
- System sans-serif fonts remain the fallback when the local web font cannot load.
- Interface icons use locally hosted Ionicons outline SVGs extracted unchanged from the official package; no icon CDN or runtime component library is loaded. New interface icons must use the local official Ionicons outline set unless an ADR explicitly accepts an exception, and accessible labels remain independent of decorative icon imagery.
- The hamburger glyph aligns with the navigation text gutter at mobile and inline-sidebar widths without reducing its interactive target.
- The theme initializes before stylesheet rendering from `documentation-theme`, falling back to `prefers-color-scheme`, and the explicit toggle choice persists in `localStorage`.
- Light and dark palettes are implemented through shared CSS custom properties and maintain matching native `color-scheme` values.

## Markdown

- Markdown supports CommonMark and GitHub Flavored Markdown.
- Raw HTML is parsed and sanitized before serving.
- Fenced `mermaid` code blocks render as Mermaid diagrams by default through the package-owned local Mermaid runtime. Mermaid rendering uses `startOnLoad: false`, `securityLevel: strict`, and `htmlLabels: false`; no Mermaid CDN or user-provided JavaScript is loaded.
- Fenced `chart` and `chartjs` code blocks render as Chart.js charts from JSON configuration. Supported chart types are `bar`, `line`, `pie`, `doughnut`, `donut`, `polarArea`, `radar`, `bubble`, and `scatter`; `donut` is normalized to Chart.js `doughnut`.
- Chart blocks must contain JSON objects with data and at least one dataset. JavaScript functions, callbacks, plugins, prototype-pollution keys, unknown chart types, and invalid JSON are rejected at render time with text-only errors.
- Mermaid and chart source text is stored only as sanitized element attributes in generated fragments and is not included in document search text. Rendered diagrams and charts expose an image role label derived from the visual title or a safe fallback.
- `compileMarkdown` derives collapsed search text only from sanitized HAST text nodes after sanitization and before stringification. Deterministic separators preserve visible block, table-cell, and line-break boundaries; URLs, attributes, comments, internal paths, raw Markdown, serialized HTML, and removed dangerous content are excluded.
- Headings receive stable `doc-`-prefixed IDs, including Unicode characters.
- Relative links ending in `.md` are rewritten to extensionless SPA routes while preserving query strings and fragments.

## Navigation and Routing

- `/` resolves client-side to the first document in deterministic total path order.
- A Markdown document maps canonically to a route derived from its first H1, preserving its containing directory; content `README.md` with `# Introduzione` maps to `/introduzione`.
- Route path segments are normalized to Unicode NFC and percent-encoded exactly once. Reserved characters such as `#`, `?`, `%`, and spaces in source directories or filename aliases remain pathname data rather than becoming fragments or queries.
- Title segments retain the existing GitHub-style slugging before NFC normalization and URL serialization; browsers may display decoded readable Unicode while navigation and manifest values remain valid encoded paths.
- The original extensionless file route is retained as a private compatibility alias only when it does not collide with any canonical route or previously assigned alias; direct visits to an accepted alias are replaced client-side with the canonical title route.
- Canonical routes are allocated before aliases in the shared normalized URL space. Duplicate or canonically equivalent NFC/NFD bases receive deterministic numeric suffixes that skip every reserved canonical base.
- Direct document routes return the application shell.
- `GET /__content/<route>` returns the corresponding HTML fragment or `404`.
- Public static requests are restricted to an allowlist of browser asset extensions; authored Markdown and HTML templates are not served as static files.
- Navigation lists documents in a deterministic total path order, using case-insensitive ordering with exact-path tie-breaking, and nests their headings by heading depth.
- The top-level document list is ordered and displays progressive decimal markers starting at `1`; every nested heading list is unordered and displays bullet markers at all depths. The same navigation markup is used by the sidebar and aggregate PDF export.
- The first H1 labels a document and is not repeated as a child heading in the menu; later headings, including later H1 elements, remain navigable. The filename is the fallback label when no H1 exists.
- Navigation labels use Capitalized Case by uppercasing the first lowercase Unicode letter of each whitespace-delimited token while preserving all remaining characters, including acronyms and product names. This presentation-only transformation does not change document content, routes, manifests, or fragment IDs.
- Internal navigation uses the History API and loads fragments on demand.
- A document menu link is active only when no heading fragment is selected; a heading link is active only when its exact fragment is selected.
- Anchor navigation decodes URL fragments and resolves headings with `getElementById`, including Unicode IDs.
- Below `900px`, navigation opens as an accessible hamburger drawer with backdrop, Escape handling, focus containment, focus restoration, and body scroll locking.
- At `900px` and above, the sidebar remains in the page grid and the hamburger can collapse or restore it without a backdrop or focus trap; this preference persists in `localStorage` under `documentation-sidebar-collapsed`.
- Sidebar opening and closing fades opacity over the existing layout transition. Inline navigation retains its expanded internal width while being clipped during collapse so labels do not reflow into narrow columns; mobile drawer content fades with its slide transition. Reduced-motion preferences make these transitions effectively immediate.
- The hamburger participates in header layout rather than being shifted only visually, and the header gap is half its previous value. An optional project logo sits between the hamburger and title without shrinking the hamburger target.
- Crossing the mobile breakpoint closes any open drawer and applies the persisted inline sidebar state.
- Selecting a navigation link closes the mobile drawer.
- A three-pixel bar below the sticky header reports reading progress relative to the current document and resets after SPA navigation.

## Document Search

- The bundled header contains a pill-shaped readonly search launcher. Focusing or clicking it closes an open mobile drawer and opens a modal search overlay; the editable dialog search input is also pill-shaped.
- Search is entirely client-side and uses the deterministic document manifest shape `{ route, aliases, title, text }`. Script-safe JSON escaping replaces `<`; the manifest contains no source-relative path, generated HTML path, raw Markdown, or rendered HTML. Search adds no endpoint, disk output, CSP change, or PDF export field.
- Indexed values are the title, decoded canonical route and aliases, and sanitized visible document text. Queries use trim, NFKD, combining-mark removal, lowercase conversion, collapsed whitespace, and deduplicated tokens. Every token must occur somewhere in the union of indexed fields; fuzzy matching, stemming, and frequency scoring are not used.
- Results rank deterministically by exact title, title prefix, title-word prefix, all tokens in title, all tokens in the canonical route, all tokens in one alias, full query phrase in body, all tokens in body, then mixed fields. Ties retain document-manifest order. An empty query shows every document and a query with no match shows a textual empty state.
- Search returns descriptors containing the document, numeric rank, match source, and optional snippet. Metadata-only matches have no snippet. When body text determines eligibility or rank, the result displays one deterministic local snippet from the original sanitized text.
- Snippets are at most 180 Unicode code points including ellipses, prefer the full query phrase and otherwise the first pertinent token in query order, target 60 code points before the match, reallocate unused space, prefer whitespace boundaries without losing the match, never split a code point, and show ellipses only on truncated sides. Result content is assigned only through `textContent`.
- Every result displays the document title and optional snippet, but does not display the canonical route or aliases. Selection always navigates to the canonical route, even when a route or alias produced the match.
- The overlay is exposed as an `aria-modal` dialog; its editable input is a combobox controlling a listbox of options. Arrow Up, Arrow Down, Home, End, and Enter operate the result selection.
- Typing changes only the overlay draft: results, snippets, empty state, and clear visibility update while the launcher remains unchanged. Escape, backdrop, close control, result selection, and programmatic `close()` commit the draft to the launcher. Reopening starts from that committed value.
- The custom `search-clear` button is visible only for a non-empty draft. Native mouse or keyboard activation clears the draft, restores all results, keeps the overlay open, and focuses the input; the native WebKit search cancel control is suppressed.
- Focus remains trapped while open, returns to the prior element after dismissal, and is not restored after result selection so normal SPA rendering can focus the document content. Body scrolling is locked while search is open.
- Search initializes only when the complete hook set, including `search-clear`, exists. Incomplete launchers and overlays are neutralized without hiding unrelated parent elements.
- Below `700px`, the header launcher occupies a full second row and document heading offsets account for the taller sticky header. Below `600px`, the search panel uses a viewport-sized mobile layout. The overlay remains above the header and sidebar and follows both themes and reduced-motion preferences.

## PDF Export

- The application header provides an accessible `Esporta PDF` button.
- The CLI provides `easy-mark export <content-directory> --pdf <file.pdf>`, which writes only the requested PDF file and does not persist intermediate HTML.
- `GET /__export` returns one non-cacheable JSON snapshot containing the complete generated navigation, every sanitized Markdown fragment currently held in `mem-fs`, and each document's source-relative asset base.
- Exported documents follow the same deterministic total path order as navigation; the navigation is the initial print section and every document starts on a new page.
- Document IDs are namespaced in the concatenated print document, and navigation, local-fragment, canonical-route, and compatibility-alias links are rewritten to those IDs.
- Sanitized ID references in `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`, `headers`, and `for` are rewritten to namespaced IDs, including whitespace-separated token lists.
- PDF route lookup uses the same canonical-first, non-colliding alias table emitted by the server; an alias can never replace a canonical PDF target.
- Server, SPA, navigation, and PDF route lookup use the same segment encoding and normalized route-key semantics without double encoding.
- Same-origin relative asset URLs, including document links, image `src`, and `srcset` candidates, are resolved against the source Markdown directory before printing. External and data URLs remain unchanged.
- Export waits for local fonts and document images to finish loading or decoding before opening the native print dialog or writing the CLI PDF.
- Export renders Mermaid diagrams and Chart.js charts before waiting for generated visual images and before opening the print dialog or writing the CLI PDF. Chart animations are disabled for deterministic export.
- The print-only container is removed from `aria-hidden` while export is active and restored during cleanup.
- Print CSS replaces the SPA only while `body.export-printing` is active; ordinary browser printing through Ctrl/Cmd+P prints the current SPA rather than an empty export container.
- Aggregate export forces a complete light print palette and `color-scheme: light` within `body.export-printing`, independently of the active application theme.
- While the export is prepared, the button is disabled and exposes busy status; failures are reported as text through an accessible live region.
- In the browser UI, export invokes the browser's native print dialog so the user can save the result as PDF. In the CLI, export uses a Playwright-compatible Chromium adapter to write the requested PDF path. The application does not write generated HTML export files to disk.

## Live Updates

- Chokidar watches real files under the selected content directory after startup.
- Additions and changes update the affected virtual file; Markdown changes regenerate its fragment.
- Deleting authored non-Markdown files removes only their mirrored virtual entries. Deleting Markdown removes its mirrored source, generated fragment, and navigation entry.
- File events are processed serially to avoid concurrent rebuilds.
- Successful updates regenerate the shell and send an SSE reload event through `GET /__events`.
- Adding, changing, or deleting content `manifest.json` regenerates the shell and updates the project title; deletion restores the CLI title fallback or `Easy Mark`.
- Browser reload preserves a still-valid route; an invalid route falls back to the first document.

## HTTP Security

- Responses include a same-origin Content Security Policy.
- Responses disable MIME sniffing and suppress referrer information.
- Client-side error messages are inserted as text nodes, not interpreted as HTML.
- Malformed URL encoding receives `400`; blocked or missing static files receive `404`.
