# easy-mark

`easy-mark` converte una directory di Markdown in frammenti HTML sanitizzati conservati in `mem-fs`, li presenta tramite una SPA e puo esportare un PDF aggregato.

## CLI

Richiede Node.js 22 o successivo. `.nvmrc` mantiene Node.js 22 come baseline di sviluppo.

```sh
nvm use
npm install
npm run start
```

Per usare il binario locale:

```sh
easy-mark serve ./doc
easy-mark serve ./doc --title "My Documentation"
easy-mark export ./doc --pdf ./bignami.pdf
```

`./doc` e solo un esempio: il percorso puo essere qualunque directory che contiene Markdown e asset pubblici. `npm run start` serve `./src` come workspace demo del repository. La porta puo essere modificata con `PORT` o con `--port` sul comando `serve`.

Il titolo visibile usa questa precedenza: `manifest.json` nella content directory, poi `--title`, poi `Easy Mark`. Il manifest e opzionale:

```json
{
  "title": "La mia documentazione",
  "logo": "/logo.svg"
}
```

`core/server/` contiene la logica server e CLI, `core/web/` contiene runtime browser, asset e template predefiniti. `core/web/index.template.html` e `core/web/styles.template.css` vengono sempre caricati in memoria come `index.html` e `styles.css`; la content directory non puo sostituirli con propri `index.html` o `styles.css`.

Il comando `serve` non scrive HTML generato su disco. Il comando `export` scrive solo il PDF richiesto e richiede un adapter Playwright/Chromium disponibile nell'ambiente.

## Commit standard

Il repository usa Conventional Commits e include un hook `commit-msg` versionato. Dopo il clone, installare le dipendenze e configurare l'hook locale:

```sh
npm install
npm run hooks:install
```

Il comando è idempotente e imposta `core.hooksPath=hooks` solo nella configurazione Git del clone corrente. Se il clone usa già un percorso hook differente, l'installer si ferma senza sovrascriverlo e richiede una decisione esplicita. Il formato può essere verificato anche manualmente:

```sh
npm run commit:validate -- --message "feat(navigation): add keyboard shortcuts"
```

Sono ammessi `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `build` e `ci`, con scope opzionale. `!` e un footer rigoroso `BREAKING CHANGE: descrizione` o `BREAKING-CHANGE: descrizione` possono indicare una modifica incompatibile indipendentemente. L'hook applica i cleanup Git determinabili senza conoscere l'invocazione: `strip` e `whitespace` sono riprodotti, `default` e `verbatim` preservano l'input, mentre `scissors` applica solo la normalizzazione whitespace per non accettare testo che Git potrebbe conservare nei commit non editati. `core.commentString` e `core.commentChar` rispettano l'ultima configurazione effettiva. I merge sono ammessi soltanto in forme Git note durante un merge reale. L'hook può essere aggirato con `--no-verify`, quindi non costituisce un controllo server-side.

La skill Codex `$generate-commit` analizza lo status e il diff staged per proporre un messaggio semantico. Non crea commit e non aggiunge file allo staging senza una richiesta esplicita.

## Workflow multi-agent Codex

Le directory con `agents` nel nome hanno responsabilità diverse:

- `.agents/skills/` contiene skill repository-scoped scoperte da Codex. Ogni skill usa il formato obbligatorio `SKILL.md` e può avere metadati `agents/openai.yaml`.
- `.codex/agents/` contiene le configurazioni TOML dei ruoli subagent del progetto.

Non devono essere unite. Codex avvia i subagent solo su richiesta esplicita; dopo modifiche alla configurazione, usare un nuovo thread.

Esempi:

```text
Usa il workflow multi-agent: fai analizzare i requisiti al planner, instrada l'implementazione in base al rischio e verifica il risultato con il verifier.

Revisiona questa modifica con il reviewer e usa il verifier per eseguire i controlli senza correggere automaticamente gli errori.
```

Le modifiche circoscritte possono essere delegate a `implementer`; sicurezza, routing, sanitizzazione, filesystem virtuale, concorrenza, watcher e architettura richiedono `senior-implementer`.

## Script di workspace

La logica eseguibile di workflow e manutenzione vive sotto `script/` e usa esclusivamente JavaScript ESM con estensione `.mjs`. Skill, metadati, configurazioni agent e guardrail restano rispettivamente Markdown, YAML, TOML e Markdown perché sono formati dichiarativi letti direttamente dagli strumenti. `hooks/commit-msg` è un wrapper POSIX minimo imposto dall'interfaccia hook di Git e delega tutta la logica al validatore `.mjs`.
