#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { serveSite } from '../core/server/runtime.js';
import { exportPdf } from '../core/server/pdf-export-runner.js';

const usage = `Uso:
  easy-mark serve <directory> [--title "My Documentation"] [--port 3000]
  easy-mark export <directory> --pdf <file.pdf> [--title "My Documentation"]
`;

function fail(message) {
  console.error(message);
  console.error('');
  console.error(usage.trimEnd());
  process.exitCode = 1;
}

function parseCommand(argumentsList) {
  const { positionals, values } = parseArgs({
    args: argumentsList,
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      pdf: { type: 'string' },
      port: { type: 'string' },
      title: { type: 'string' }
    }
  });

  return {
    command: positionals[0],
    sourceDirectory: positionals[1],
    help: values.help,
    pdfPath: values.pdf,
    port: values.port,
    title: values.title
  };
}

export function isCliEntrypoint(entryPath = process.argv[1], importMetaUrl = import.meta.url) {
  if (!entryPath) return false;
  const modulePath = fileURLToPath(importMetaUrl);
  try {
    return fs.realpathSync(entryPath) === fs.realpathSync(modulePath);
  } catch {
    return path.resolve(entryPath) === modulePath;
  }
}

export async function runCli(argumentsList = process.argv.slice(2), {
  serve = serveSite,
  exportToPdf = exportPdf,
  logger = console
} = {}) {
  let request;
  try {
    request = parseCommand(argumentsList);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Argomenti non validi');
  }

  if (request.help) {
    logger.log(usage.trimEnd());
    return null;
  }
  if (!request.command || !request.sourceDirectory) {
    throw new Error('Specifica un comando e una directory contenuti.');
  }

  const sourceDirectory = path.resolve(request.sourceDirectory);

  if (request.command === 'serve') {
    if (request.pdfPath) throw new Error('serve non accetta --pdf.');
    const port = request.port === undefined ? undefined : Number.parseInt(request.port, 10);
    if (request.port !== undefined && (!Number.isInteger(port) || port <= 0)) {
      throw new Error('--port deve essere un intero positivo.');
    }
    return serve({ sourceDirectory, title: request.title, port, logger });
  }

  if (request.command === 'export') {
    if (request.port) throw new Error('export non accetta --port.');
    if (!request.pdfPath) throw new Error('export richiede --pdf <file.pdf>.');
    await exportToPdf({
      sourceDirectory,
      title: request.title,
      pdfPath: path.resolve(request.pdfPath)
    });
    logger.log(`PDF scritto in ${path.resolve(request.pdfPath)}`);
    return null;
  }

  throw new Error(`Comando non supportato: ${request.command}`);
}

if (isCliEntrypoint()) {
  runCli().catch((error) => {
    fail(error instanceof Error ? error.message : 'Errore sconosciuto');
  });
}
