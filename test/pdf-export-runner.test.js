import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { exportPdf } from '../core/server/pdf-export-runner.js';

test('exportPdf orchestra Chromium e scrive solo il PDF richiesto', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'easy-mark-pdf-source-'));
  const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'easy-mark-pdf-out-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  context.after(() => fs.rm(outputDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina PDF\n\nContenuto');
  const pdfPath = path.join(outputDirectory, 'bignami.pdf');
  const calls = [];
  const playwrightModule = {
    chromium: {
      async launch() {
        calls.push('launch');
        return {
          async newPage() {
            calls.push('newPage');
            return {
              async goto(url, options) {
                calls.push(['goto', url, options.waitUntil]);
              },
              async evaluate(callback) {
                calls.push(['evaluate', callback instanceof Function]);
              },
              async pdf(options) {
                calls.push(['pdf', options.path, options.printBackground, options.preferCSSPageSize]);
                await fs.writeFile(options.path, Buffer.from('%PDF-1.7\n'));
              }
            };
          },
          async close() {
            calls.push('close');
          }
        };
      }
    }
  };

  await exportPdf({ sourceDirectory, pdfPath, playwrightModule });

  assert.equal(await fs.readFile(pdfPath, 'utf8'), '%PDF-1.7\n');
  assert.equal(await fs.access(path.join(sourceDirectory, 'page.html')).then(() => true, () => false), false);
  assert.equal(calls[0], 'launch');
  assert.equal(calls[1], 'newPage');
  assert.deepEqual(calls[3], ['evaluate', true]);
  assert.deepEqual(calls[4], ['pdf', pdfPath, true, true]);
  assert.equal(calls.at(-1), 'close');
});
