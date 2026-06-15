# Introduzione

Questa cartella e la content directory usata da `npm run start` durante lo sviluppo del repository. In un progetto installato da NPM puoi passare qualunque directory equivalente:

```sh
easy-mark serve ./doc
easy-mark serve ./doc --title "My Documentation"
easy-mark export ./doc --pdf ./bignami.pdf
```

## Impostare il titolo

`manifest.json` e opzionale. Se presente nella content directory, prevale su `--title`; se assente, easy-mark usa `--title` oppure il fallback `Easy Mark`.

```json
{
  "title": "La mia documentazione",
  "logo": "/logo.svg"
}
```

Il campo facoltativo `logo` indica un'immagine locale mostrata tra il menu hamburger e il titolo. `/logo.svg` usa il logo predefinito incluso in easy-mark. Per sostituirlo mantenendo lo stesso manifest, crea un file `logo.svg` nella content directory.

Puoi anche usare un percorso diverso, per esempio `"logo": "/brand/azienda.png"` con il file `brand/azienda.png`. Sono supportati SVG, PNG, JPEG, GIF, WebP e ICO. Imposta `"logo": null` oppure ometti il campo per non mostrare alcun logo.

## Aggiungere documenti

Crea file `.md` direttamente nella content directory oppure organizzali in sottocartelle. Il primo titolo H1 del documento, scritto con `# Titolo`, diventa il nome mostrato nel menu e la route canonica.

```md
# Guida installazione

Testo introduttivo.

## Primo avvio

Istruzioni per iniziare.
```

I titoli successivi diventano collegamenti nel sottomenu. I link verso altri file Markdown possono essere scritti normalmente, per esempio `[Configurazione](configurazione.md)`.

## Runtime

easy-mark include shell HTML e stile CSS completi. I file root `index.html` e `styles.css` sono riservati al runtime e non sono personalizzabili dalla content directory.

La ricerca include titolo, route, alias e testo visibile dei documenti dopo la sanitizzazione, ma i risultati mostrano solo titolo e snippet eventuale.

## Vedere le modifiche

Avvia il progetto con:

```sh
npm run start
```

Apri `http://localhost:3000`. Le modifiche a Markdown, manifest e asset vengono applicate automaticamente e la pagina si ricarica.

Vai alla [guida iniziale](guide/getting-started.md).
