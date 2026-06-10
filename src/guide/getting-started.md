# Guida iniziale

Il server è disponibile sulla porta `3000`.

## Avvio

```sh
npm run start
```

## Funzionalità

- rendering CommonMark e GFM
- file virtuali con `mem-fs`
- live reload con Chokidar e SSE

### Sicurezza

L'HTML generato viene sanitizzato prima della pubblicazione.
