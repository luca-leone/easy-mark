# Introduzione

Questa cartella contiene la documentazione pubblicata da easy-mark. Modifica questo file o aggiungi altri file Markdown con estensione `.md`: il menu e le pagine si aggiornano automaticamente mentre l'applicazione è in esecuzione.

## Impostare il titolo

Apri `src/manifest.json` e modifica il campo `title`:

```json
{
  "title": "La mia documentazione"
}
```

Il titolo viene mostrato nell'header e nel titolo della scheda del browser. `manifest.json` deve contenere JSON valido e un campo `title` testuale non vuoto.

## Aggiungere documenti

Crea file `.md` direttamente in `src/` oppure organizzali in sottocartelle. Il primo titolo H1 del documento, scritto con `# Titolo`, diventa il nome mostrato nel menu.

```md
# Guida installazione

Testo introduttivo.

## Primo avvio

Istruzioni per iniziare.
```

I titoli successivi diventano collegamenti nel sottomenu. I link verso altri file Markdown possono essere scritti normalmente, per esempio `[Configurazione](configurazione.md)`.

## Personalizzare lo stile

easy-mark include già uno stile completo. Per sostituirlo, crea `src/styles.css`: questo file diventa l'intero foglio di stile dell'applicazione e ha priorità sul template fornito out of the box.

L'override è completo, non incrementale. Se vuoi partire dallo stile predefinito, usa come riferimento `core/web/styles.template.css`. Eliminando `src/styles.css`, easy-mark torna automaticamente allo stile predefinito.

## Personalizzare il markup

Per sostituire la shell HTML crea `src/index.html`. Anche questo è un override completo del template `core/web/index.template.html`.

Il file deve contenere esattamente una volta questi placeholder:

```html
<!-- NAVIGATION -->
<!-- DOCUMENT_MANIFEST -->
```

Usa `<!-- PROJECT_TITLE -->` nei punti in cui vuoi inserire il valore di `title` definito in `src/manifest.json`. Il placeholder è facoltativo e può comparire più volte.

Per continuare a usare tutte le funzioni incluse, conserva anche gli elementi e gli ID presenti nel template predefinito, il collegamento a `/styles.css` e gli script `/theme-init.js` e `/app.js`.

### Esempio HTML alternativo

Questo esempio può essere usato come contenuto di `src/index.html` e mantiene tutte le funzioni incluse:

```html
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><!-- PROJECT_TITLE --></title>
    <script src="/theme-init.js"></script>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="app-header">
      <button id="menu-toggle" class="icon-button app-header__menu" type="button"
        aria-label="Apri navigazione" aria-controls="app-sidebar" aria-expanded="false">
        <span class="icon icon--menu" aria-hidden="true"></span>
      </button>
      <a class="app-header__brand" href="/"><!-- PROJECT_TITLE --></a>
      <div class="app-header__actions">
        <button id="pdf-export" class="text-button" type="button"
          aria-describedby="pdf-export-status">Esporta PDF</button>
        <button id="theme-toggle" class="icon-button" type="button"
          aria-label="Attiva tema scuro">
          <span class="icon icon--theme" aria-hidden="true"></span>
        </button>
      </div>
      <p id="pdf-export-status" class="visually-hidden" role="status" aria-live="polite"></p>
      <div id="reading-progress" class="reading-progress" role="progressbar"
        aria-label="Avanzamento lettura" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="reading-progress__bar"></span>
      </div>
    </header>

    <div class="app-layout">
      <aside id="app-sidebar" class="app-sidebar" aria-label="Navigazione documentazione">
        <div class="app-sidebar__header">
          <span>Indice</span>
          <button id="menu-close" class="icon-button" type="button" aria-label="Chiudi navigazione">
            <span class="icon icon--close" aria-hidden="true"></span>
          </button>
        </div>
        <!-- NAVIGATION -->
      </aside>
      <button id="sidebar-backdrop" class="sidebar-backdrop" type="button"
        aria-label="Chiudi navigazione" tabindex="-1"></button>
      <main id="content" class="document" tabindex="-1" aria-live="polite"></main>
    </div>

    <div id="print-export" class="print-export" aria-hidden="true"></div>
    <!-- DOCUMENT_MANIFEST -->
    <script type="module" src="/app.js"></script>
  </body>
</html>
```

Eliminando `src/index.html`, easy-mark ripristina automaticamente la shell predefinita.

## Vedere le modifiche

Avvia il progetto con:

```sh
npm run start
```

Apri `http://localhost:3000`. Le modifiche a Markdown, manifest, asset e override vengono applicate automaticamente e la pagina si ricarica.

Vai alla [guida iniziale](guide/getting-started.md).
