# Application Contract

## Startup

- The application supports Node.js 22 and later; Node.js 22 remains the development and verification baseline.
- The product name, package name, and startup log remain `easy-mark`; the hosted documentation title is configured independently through `src/manifest.json`.
- `npm run start` starts the application through `core/server/server.js` with Node.js.
- The default HTTP port is `3000`; `PORT` may override it.
- Startup fails when either bundled template under `core/web/` is missing, when a `src/index.html` override is structurally invalid, when a present `src/manifest.json` is invalid, or when all Markdown documents are missing.
- The server starts only after the initial virtual build and navigation generation complete.

## Virtual Build

- Browser runtime files and static assets under `core/web/` are copied into `mem-fs`; `index.template.html` and `styles.template.css` are exposed there as `index.html` and `styles.css` without exposing their `.template` names.
- Every real file under `src/` is then copied into `mem-fs` with its relative structure preserved, taking precedence over a same-path bundled web file.
- Each `src/**/*.md` file additionally produces a corresponding `.html` fragment under a generated-only `mem-fs` root that is disjoint from the mirrored authored paths.
- An authored `.html` file may coexist with the generated fragment for a same-stem Markdown file without replacing it or being exposed as document content.
- Converted HTML fragments are never written to the real filesystem.
- The resolved virtual `index.html` is the sole application shell and the resolved virtual `styles.css` is the sole global stylesheet.
- Optional `src/index.html` and `src/styles.css` files override the bundled templates. Deleting either override during live development restores its bundled template immediately.
- A `src/index.html` override must contain exactly one `<!-- NAVIGATION -->` placeholder and exactly one `<!-- DOCUMENT_MANIFEST -->` placeholder.
- The bundled shell contains exactly two `<!-- PROJECT_TITLE -->` placeholders. A user override may contain zero or more; each occurrence is replaced with the HTML-escaped project title.

## Project Metadata

- `src/manifest.json` is optional public configuration. When absent or deleted, the project title defaults to `easy-mark`.
- When present, the manifest must be valid JSON with an object root and a non-empty string `title`; surrounding whitespace is removed and additional properties are ignored.
- The project title is rendered in the bundled header and initial `<title>`, and browser navigation formats dynamic titles as `<document title> — <project title>`.
- The resolved metadata is embedded as escaped JSON in a `project-manifest` script element for the browser runtime. Values containing `<` cannot terminate the script or inject markup.
- Invalid manifest updates preserve the last valid virtual state, emit no reload event, and do not prevent later file events from being processed.

## Typography and Presentation

- Google Sans is self-hosted from variable WOFF2 Latin and Latin Extended subsets under `core/web/fonts/google-sans/`; runtime rendering makes no external font requests.
- The base desktop font size is `18px`, with responsive document headings and a larger reading scale than browser defaults.
- The default visual system is defined only in `core/web/styles.template.css`; an optional `src/styles.css` replaces it as the served global stylesheet.
- System sans-serif fonts remain the fallback when the local web font cannot load.
- Interface icons use locally hosted Ionicons outline SVGs extracted from the official package; no icon CDN or runtime component library is loaded.
- The hamburger glyph aligns with the navigation text gutter at mobile and inline-sidebar widths without reducing its interactive target.
- The theme initializes before stylesheet rendering from `documentation-theme`, falling back to `prefers-color-scheme`, and the explicit toggle choice persists in `localStorage`.
- Light and dark palettes are implemented through shared CSS custom properties and maintain matching native `color-scheme` values.

## Markdown

- Markdown supports CommonMark and GitHub Flavored Markdown.
- Raw HTML is parsed and sanitized before serving.
- Headings receive stable `doc-`-prefixed IDs, including Unicode characters.
- Relative links ending in `.md` are rewritten to extensionless SPA routes while preserving query strings and fragments.

## Navigation and Routing

- `/` resolves client-side to the first document in deterministic total path order.
- A Markdown document maps canonically to a route derived from its first H1, preserving its containing directory; `src/README.md` with `# Introduzione` maps to `/introduzione`.
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
- Crossing the mobile breakpoint closes any open drawer and applies the persisted inline sidebar state.
- Selecting a navigation link closes the mobile drawer.
- A three-pixel bar below the sticky header reports reading progress relative to the current document and resets after SPA navigation.

## PDF Export

- The application header provides an accessible `Esporta PDF` button.
- `GET /__export` returns one non-cacheable JSON snapshot containing the complete generated navigation, every sanitized Markdown fragment currently held in `mem-fs`, and each document's source-relative asset base.
- Exported documents follow the same deterministic total path order as navigation; the navigation is the initial print section and every document starts on a new page.
- Document IDs are namespaced in the concatenated print document, and navigation, local-fragment, canonical-route, and compatibility-alias links are rewritten to those IDs.
- Sanitized ID references in `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`, `headers`, and `for` are rewritten to namespaced IDs, including whitespace-separated token lists.
- PDF route lookup uses the same canonical-first, non-colliding alias table emitted by the server; an alias can never replace a canonical PDF target.
- Server, SPA, navigation, and PDF route lookup use the same segment encoding and normalized route-key semantics without double encoding.
- Same-origin relative asset URLs, including document links, image `src`, and `srcset` candidates, are resolved against the source Markdown directory before printing. External and data URLs remain unchanged.
- Export waits for local fonts and document images to finish loading or decoding before opening the native print dialog.
- The print-only container is removed from `aria-hidden` while export is active and restored during cleanup.
- Print CSS replaces the SPA only while `body.export-printing` is active; ordinary browser printing through Ctrl/Cmd+P prints the current SPA rather than an empty export container.
- Aggregate export forces a complete light print palette and `color-scheme: light` within `body.export-printing`, independently of the active application theme.
- While the export is prepared, the button is disabled and exposes busy status; failures are reported as text through an accessible live region.
- Export invokes the browser's native print dialog so the user can save the result as PDF. The application does not write HTML or PDF export files to disk.

## Live Updates

- Chokidar watches real files under `src/` after startup.
- Additions and changes update the affected virtual file; Markdown changes regenerate its fragment.
- Deleting authored non-Markdown files removes only their mirrored virtual entries. Deleting Markdown removes its mirrored source, generated fragment, and navigation entry.
- File events are processed serially to avoid concurrent rebuilds.
- Successful updates regenerate the shell and send an SSE reload event through `GET /__events`.
- Adding, changing, or deleting `src/manifest.json` regenerates the shell and updates the project title; deletion restores the default title.
- Browser reload preserves a still-valid route; an invalid route falls back to the first document.

## HTTP Security

- Responses include a same-origin Content Security Policy.
- Responses disable MIME sniffing and suppress referrer information.
- Client-side error messages are inserted as text nodes, not interpreted as HTML.
- Malformed URL encoding receives `400`; blocked or missing static files receive `404`.
