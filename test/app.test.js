import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../core/server/app.js';
import { SiteBuilder } from '../core/server/site-builder.js';

test('serve app shell, frammenti e asset dalla memoria', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-http-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  await fs.writeFile(path.join(sourceDirectory, 'manifest.json'), '{"title":"Manuale"}');
  await fs.writeFile(path.join(sourceDirectory, 'page.html'), '<script>authoredUnsafe()</script>');
  await fs.mkdir(path.join(sourceDirectory, 'fonts', 'google-sans'), { recursive: true });
  await fs.writeFile(path.join(sourceDirectory, 'fonts', 'google-sans', 'google-sans-latin.woff2'), Buffer.from('wOF2'));
  await fs.mkdir(path.join(sourceDirectory, 'icons', 'ionicons'), { recursive: true });
  await fs.writeFile(path.join(sourceDirectory, 'icons', 'ionicons', 'menu-outline.svg'), '<svg></svg>');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();
  const { app } = createApp(builder);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const shellResponse = await fetch(`${baseUrl}/page`, { headers: { Accept: 'text/html' } });
  assert.equal(shellResponse.status, 200);
  const shell = await shellResponse.text();
  assert.match(shell, /document-manifest/);
  assert.match(shell, /project-manifest[^]*"title":"Manuale"/);

  const contentResponse = await fetch(`${baseUrl}/__content/page`);
  assert.equal(contentResponse.status, 200);
  assert.match(await contentResponse.text(), /<h1 id="doc-pagina">/);

  const exportResponse = await fetch(`${baseUrl}/__export`);
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get('content-type'), /application\/json/);
  assert.equal(exportResponse.headers.get('cache-control'), 'no-store');
  assert.match(exportResponse.headers.get('content-security-policy'), /default-src 'self'/);
  const exportSnapshot = await exportResponse.json();
  assert.deepEqual(exportSnapshot.documents.map(({ route }) => route), ['/pagina']);
  assert.equal(exportSnapshot.documents[0].assetBase, '/');
  assert.match(exportSnapshot.navigation, /class="navigation"/);
  assert.match(exportSnapshot.documents[0].html, /<h1 id="doc-pagina">/);
  assert.doesNotMatch(exportSnapshot.documents[0].html, /authoredUnsafe|<script>/);

  const styleResponse = await fetch(`${baseUrl}/styles.css`);
  assert.equal(styleResponse.status, 200);
  assert.match(styleResponse.headers.get('content-type'), /text\/css/);
  assert.match(styleResponse.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(styleResponse.headers.get('x-content-type-options'), 'nosniff');

  const fontResponse = await fetch(`${baseUrl}/fonts/google-sans/google-sans-latin.woff2`);
  assert.equal(fontResponse.status, 200);
  assert.match(fontResponse.headers.get('content-type'), /font\/woff2|application\/font-woff/);

  const iconResponse = await fetch(`${baseUrl}/icons/ionicons/menu-outline.svg`);
  assert.equal(iconResponse.status, 200);
  assert.match(iconResponse.headers.get('content-type'), /image\/svg\+xml/);

  const searchIconResponse = await fetch(`${baseUrl}/icons/ionicons/search-outline.svg`);
  assert.equal(searchIconResponse.status, 200);
  assert.match(searchIconResponse.headers.get('content-type'), /image\/svg\+xml/);

  const clearIconResponse = await fetch(`${baseUrl}/icons/ionicons/close-outline.svg`);
  assert.equal(clearIconResponse.status, 200);
  assert.match(clearIconResponse.headers.get('content-type'), /image\/svg\+xml/);

  const searchModuleResponse = await fetch(`${baseUrl}/search.js`);
  assert.equal(searchModuleResponse.status, 200);
  assert.match(await searchModuleResponse.text(), /export function initializeSearch/);

  const logoResponse = await fetch(`${baseUrl}/logo.svg`);
  assert.equal(logoResponse.status, 200);
  assert.match(logoResponse.headers.get('content-type'), /image\/svg\+xml/);

  const manifestResponse = await fetch(`${baseUrl}/manifest.json`);
  assert.equal(manifestResponse.status, 200);
  assert.deepEqual(await manifestResponse.json(), { title: 'Manuale' });

  assert.equal((await fetch(`${baseUrl}/page.md`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/page.html`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/index.html`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/index.template.html`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/styles.template.css`)).status, 404);
});

test('restituisce un errore JSON sicuro se lo snapshot di esportazione fallisce', async (context) => {
  const { app } = createApp({
    getExportSnapshot() {
      throw new Error('<script>segreto</script>');
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());

  const response = await fetch(`http://127.0.0.1:${server.address().port}/__export`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Impossibile preparare l\u2019esportazione' });
});

test('serve la route canonica quando un alias sorgente collide su /bar', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-http-route-collision-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'a.md'), '# Bar\n\nContenuto canonico');
  await fs.writeFile(path.join(sourceDirectory, 'bar.md'), '# Baz\n\nContenuto alias collidente');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();
  const { app } = createApp(builder);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/__content/bar`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Contenuto canonico/);
  const snapshot = await (await fetch(`${baseUrl}/__export`)).json();
  assert.deepEqual(snapshot.documents.map(({ route, aliases }) => ({ route, aliases })), [
    { route: '/bar', aliases: ['/a'] },
    { route: '/baz', aliases: [] }
  ]);
});

test('serve route Unicode normalizzate dentro directory con caratteri riservati', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-http-special-routes-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  const directory = path.join(sourceDirectory, 'guide #1?');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'a.md'), '# Caf\u00e9\n\nPrimo');
  await fs.writeFile(path.join(directory, 'b.md'), '# Cafe\u0301\n\nSecondo');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();
  const { app } = createApp(builder);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const normalizedResponse = await fetch(`${baseUrl}/__content/guide%20%231%3F/cafe%CC%81`);
  assert.equal(normalizedResponse.status, 200);
  assert.match(await normalizedResponse.text(), /Primo/);
  const suffixedResponse = await fetch(`${baseUrl}/__content/guide%20%231%3F/caf%C3%A9-2`);
  assert.equal(suffixedResponse.status, 200);
  assert.match(await suffixedResponse.text(), /Secondo/);
  const snapshot = await (await fetch(`${baseUrl}/__export`)).json();
  assert.deepEqual(snapshot.documents.map(({ route }) => route), [
    '/guide%20%231%3F/caf%C3%A9',
    '/guide%20%231%3F/caf%C3%A9-2'
  ]);
});
