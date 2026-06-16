# easy-mark

`easy-mark` converts a Markdown directory into sanitised HTML fragments held in `mem-fs`, presents them through a single-page application, and can export an aggregate PDF.

## CLI

It requires Node.js 22 or later. `.nvmrc` keeps Node.js 22 as the development baseline.

```sh
nvm use
npm install
```

Use the local binary against any content directory:

```sh
easy-mark serve ./doc
easy-mark serve ./doc --title "My Documentation"
easy-mark export ./doc --pdf ./guide.pdf
```

`./doc` is only an example: the path may be any directory containing Markdown and public assets. The port can be changed with `PORT` or with `--port` on the `serve` command.

The visible title uses this precedence: `manifest.json` in the content directory, then `--title`, then `Easy Mark`. The manifest is optional:

```json
{
  "title": "My documentation",
  "logo": "/logo.svg"
}
```

`core/server/` contains the server and CLI logic, while `core/web/` contains the browser runtime, assets, and default templates. `core/web/index.template.html` and `core/web/styles.template.css` are always loaded into memory as `index.html` and `styles.css`; the content directory cannot replace them with its own `index.html` or `styles.css`.

The `serve` command does not write generated HTML to disk. The `export` command writes only the requested PDF and requires a Playwright/Chromium adapter to be available in the environment.

## Diagrams and Charts

Mermaid diagrams are supported through fenced Markdown blocks:

````md
```mermaid
flowchart TD
  A --> B
```
````

Chart.js charts are supported through JSON fenced blocks:

````md
```chart
{
  "type": "donut",
  "title": "Revenue by product",
  "data": {
    "labels": ["Core", "Add-ons", "Services"],
    "datasets": [
      { "label": "Revenue", "data": [62, 23, 15] }
    ]
  }
}
```
````

The chart block accepts `bar`, `line`, `pie`, `doughnut`, `donut`, `polarArea`, `radar`, `bubble`, and `scatter`. `donut` is a friendly alias for Chart.js `doughnut`. Chart configuration must be JSON, not JavaScript, so callbacks and custom plugins are not accepted.

## Commit Standards

The repository uses Conventional Commits and includes a versioned `commit-msg` hook. After cloning, install the dependencies and configure the local hook:

```sh
npm install
npm run hooks:install
```

The command is idempotent and sets `core.hooksPath=hooks` only in the Git configuration for the current clone. If the clone already uses a different hook path, the installer stops without overwriting it and requires an explicit decision. The format can also be checked manually:

```sh
npm run commit:validate -- --message "feat(navigation): add keyboard shortcuts"
```

Allowed types are `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `build`, and `ci`, with an optional scope. `!` and a strict `BREAKING CHANGE: description` or `BREAKING-CHANGE: description` footer can independently mark an incompatible change. The hook applies Git clean-up modes that can be determined without knowing the invocation: `strip` and `whitespace` are reproduced, `default` and `verbatim` preserve the input, while `scissors` applies only whitespace normalisation so text that Git might keep in non-edited commits is not accepted accidentally. `core.commentString` and `core.commentChar` respect the last effective configuration. Merge subjects are accepted only in known Git forms during a real merge. The hook can be bypassed with `--no-verify`, so it is not a server-side control.

The Codex `$generate-commit` skill analyses the status and staged diff to propose a semantic message. It does not create commits or stage files without an explicit request.

## Codex Multi-Agent Workflow

The directories whose names include `agents` have different responsibilities:

- `.agents/skills/` contains repository-scoped skills discovered by Codex. Each skill uses the required `SKILL.md` format and may include `agents/openai.yaml` metadata.
- `.codex/agents/` contains the TOML configuration for the project's subagent roles.

They must not be merged. Codex starts subagents only when explicitly requested; after configuration changes, use a new thread.

Examples:

```text
Use the multi-agent workflow: have the planner analyse the requirements, route implementation by risk, and verify the result with the verifier.

Review this change with the reviewer and use the verifier to run checks without automatically fixing failures.
```

Narrow changes can be delegated to `implementer`; security, routing, sanitisation, virtual filesystems, concurrency, watchers, and architecture require `senior-implementer`.

## Workspace Scripts

Executable workflow and maintenance logic lives under `script/` and uses only ESM JavaScript with the `.mjs` extension. Skills, metadata, agent configurations, and guardrails remain Markdown, YAML, TOML, and Markdown respectively because they are declarative formats read directly by tools. `hooks/commit-msg` is the minimal POSIX wrapper required by Git's hook interface and delegates all logic to the `.mjs` validator.
