import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compareDocumentPaths, SiteBuilder } from '../core/server/site-builder.js';

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-spa-'));
  await fs.mkdir(path.join(directory, 'guide'));
  await fs.writeFile(path.join(directory, 'guide', 'page.md'), '# Pagina\n\n## Sezione');
  return directory;
}

function readDocumentManifest(builder) {
  const shell = builder.read('index.html').toString();
  const json = shell.match(/<script id="document-manifest" type="application\/json">([^]*?)<\/script>/)?.[1];
  assert.ok(json);
  return JSON.parse(json);
}

test('mantiene HTML generato solo in mem-fs e costruisce shell e menu', async (context) => {
  const sourceDirectory = await fixture();
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  assert.equal(await fs.access(path.join(sourceDirectory, 'guide', 'page.html')).then(() => true, () => false), false);
  assert.equal(builder.read('guide/page.html'), null);
  assert.match(builder.readGenerated('guide/page.html').toString(), /id="doc-pagina"/);
  assert.equal(builder.getExportSnapshot().documents[0].assetBase, '/guide/');
  assert.match(builder.read('index.html').toString(), /href="\/guide\/pagina"/);
  assert.equal(builder.routeToHtmlPath('/guide/pagina'), path.join('guide', 'page.html'));
  assert.equal(builder.routeToHtmlPath('/guide/page'), path.join('guide', 'page.html'));
  assert.deepEqual(readDocumentManifest(builder), [{
    route: '/guide/pagina',
    aliases: ['/guide/page'],
    title: 'Pagina',
    text: 'Pagina Sezione'
  }]);
});

test('serializza nel document manifest solo metadata pubblici e testo sanitizzato con escaping script-safe', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-search-manifest-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(sourceDirectory, 'page.md'),
    '# Ricerca\n\nTesto sicuro `</script><script>non eseguire</script>`\n\n<script>rimosso</script>'
  );
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const shell = builder.read('index.html').toString();
  const [document] = readDocumentManifest(builder);
  assert.deepEqual(Object.keys(document), ['route', 'aliases', 'title', 'text']);
  assert.equal(document.text, 'Ricerca Testo sicuro </script><script>non eseguire</script>');
  assert.match(shell, /"text":"Ricerca Testo sicuro \\u003c\/script>\\u003cscript>non eseguire\\u003c\/script>"/);
  assert.doesNotMatch(shell.match(/id="document-manifest"[^]*?<\/script>/)?.[0] ?? '', /relativePath|htmlPath|searchText|\.md|<script>non eseguire/);
  assert.equal(await fs.access(path.join(sourceDirectory, 'page.html')).then(() => true, () => false), false);

  const exportDocument = builder.getExportSnapshot().documents[0];
  assert.deepEqual(Object.keys(exportDocument), ['route', 'aliases', 'title', 'assetBase', 'html']);
});

test('usa sempre i template web predefiniti senza override HTML o CSS', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-template-overlay-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  assert.match(builder.read('index.html').toString(), /<title>Easy Mark<\/title>/);
  assert.match(builder.read('styles.css').toString(), /font-family: "Google Sans"/);
  assert.match(builder.read('search.js').toString(), /export function initializeSearch/);
  assert.match(builder.read('icons/ionicons/search-outline.svg').toString(), /class="ionicon"/);
  assert.equal(builder.read('index.template.html'), null);
  assert.equal(builder.read('styles.template.css'), null);
});

test('rifiuta index.html e styles.css nella directory contenuti', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-reserved-runtime-files-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  await fs.writeFile(path.join(sourceDirectory, 'index.html'), '<main>Custom</main>');

  await assert.rejects(
    new SiteBuilder({ sourceDirectory }).build(),
    /index\.html: index\.html e styles\.css sono riservati/
  );

  await fs.unlink(path.join(sourceDirectory, 'index.html'));
  await fs.writeFile(path.join(sourceDirectory, 'styles.css'), 'body{}');
  await assert.rejects(
    new SiteBuilder({ sourceDirectory }).build(),
    /styles\.css: index\.html e styles\.css sono riservati/
  );
});

test('applica manifest, escaping e fallback durante gli aggiornamenti live', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-project-manifest-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  const manifestPath = path.join(sourceDirectory, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify({ title: '  Guide <script>alert(1)</script>  ' }));
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  let shell = builder.read('index.html').toString();
  assert.match(shell, /<title>Guide &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/title>/);
  assert.match(shell, /class="app-header__title">Guide &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/span>/);
  assert.match(shell, /id="project-manifest"[^>]*>{"title":"Guide \\u003cscript>alert\(1\)\\u003c\/script>","logo":null}<\/script>/);

  await fs.writeFile(manifestPath, '{"title":"Manuale API"}');
  await builder.handleFileEvent('change', manifestPath);
  assert.match(builder.read('index.html').toString(), /<title>Manuale API<\/title>/);

  await fs.writeFile(manifestPath, '{"title":""}');
  await assert.rejects(builder.handleFileEvent('change', manifestPath), /title deve essere una stringa non vuota/);
  assert.match(builder.read('index.html').toString(), /<title>Manuale API<\/title>/);

  await fs.unlink(manifestPath);
  await builder.handleFileEvent('unlink', manifestPath);
  shell = builder.read('index.html').toString();
  assert.match(shell, /<title>Easy Mark<\/title>/);
  assert.match(shell, /id="project-manifest"[^>]*>{"title":"Easy Mark","logo":null}<\/script>/);
});

test('usa il title CLI come fallback quando manifest.json è assente', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-cli-title-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  const builder = new SiteBuilder({ sourceDirectory, title: 'CLI Docs' });
  await builder.build();

  const shell = builder.read('index.html').toString();
  assert.match(shell, /<title>CLI Docs<\/title>/);
  assert.match(shell, /id="project-manifest"[^>]*>{"title":"CLI Docs","logo":null}<\/script>/);
});

test('manifest.json prevale sul title CLI', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-manifest-title-precedence-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  await fs.writeFile(path.join(sourceDirectory, 'manifest.json'), '{"title":"Manuale"}');
  const builder = new SiteBuilder({ sourceDirectory, title: 'CLI Docs' });
  await builder.build();

  const shell = builder.read('index.html').toString();
  assert.match(shell, /<title>Manuale<\/title>/);
  assert.match(shell, /id="project-manifest"[^>]*>{"title":"Manuale","logo":null}<\/script>/);
  assert.doesNotMatch(shell, /PROJECT_TITLE/);
});

test('usa il logo bundled, applica override src e ripristina il fallback', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-project-logo-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  await fs.writeFile(path.join(sourceDirectory, 'manifest.json'), '{"title":"Manuale","logo":"/logo.svg"}');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const bundledLogo = builder.read('logo.svg').toString();
  assert.match(bundledLogo, /fill="#0b57d0"/);
  assert.match(builder.read('index.html').toString(), /<img class="app-header__logo" src="\/logo\.svg" alt="">/);

  const logoPath = path.join(sourceDirectory, 'logo.svg');
  await fs.writeFile(logoPath, '<svg id="custom"></svg>');
  await builder.handleFileEvent('add', logoPath);
  assert.equal(builder.read('logo.svg').toString(), '<svg id="custom"></svg>');

  await fs.unlink(logoPath);
  await builder.handleFileEvent('unlink', logoPath);
  assert.equal(builder.read('logo.svg').toString(), bundledLogo);
  assert.match(builder.read('index.html').toString(), /src="\/logo\.svg"/);
});

test('non renderizza un logo configurato finché l’asset non esiste', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-missing-project-logo-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'page.md'), '# Pagina');
  await fs.writeFile(path.join(sourceDirectory, 'manifest.json'), '{"title":"Manuale","logo":"/brand/custom.png"}');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();
  assert.doesNotMatch(builder.read('index.html').toString(), /app-header__logo/);

  const logoPath = path.join(sourceDirectory, 'brand', 'custom.png');
  await fs.mkdir(path.dirname(logoPath));
  await fs.writeFile(logoPath, Buffer.from('custom-logo'));
  await builder.handleFileEvent('add', logoPath);
  assert.match(builder.read('index.html').toString(), /src="\/brand\/custom\.png"/);
});

test('usa il primo H1 come route canonica e conserva il nome file come alias', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-route-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'README.md'), '# Introduzione\n\n## Navigazione');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const shell = builder.read('index.html').toString();
  assert.match(shell, /href="\/introduzione"/);
  assert.equal((shell.match(/>Introduzione<\/a>/g) ?? []).length, 1);
  assert.doesNotMatch(shell, /href="\/introduzione#doc-introduzione"/);
  assert.match(shell, /href="\/introduzione#doc-navigazione"[^>]*>Navigazione<\/a>/);
  assert.doesNotMatch(shell, /href="\/README"/);
  assert.match(shell, /"aliases":\["\/README"\]/);
  assert.equal(builder.routeToHtmlPath('/introduzione'), 'README.html');
  assert.equal(builder.routeToHtmlPath('/README'), 'README.html');
  assert.match(builder.readGenerated('README.html').toString(), /<h1 id="doc-introduzione">Introduzione<\/h1>/);
});

test('aggiorna contenuti e menu per add, change e unlink', async (context) => {
  const sourceDirectory = await fixture();
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const addedPath = path.join(sourceDirectory, 'guide', 'added.md');
  await fs.writeFile(addedPath, '# Aggiunto\n\nCorpo iniziale');
  await builder.handleFileEvent('add', addedPath);
  assert.match(builder.readGenerated('guide/added.html').toString(), /Aggiunto/);
  assert.match(builder.read('index.html').toString(), /\/guide\/aggiunto/);
  assert.equal(readDocumentManifest(builder).find(({ route }) => route === '/guide/aggiunto').text, 'Aggiunto Corpo iniziale');

  await fs.writeFile(addedPath, '# Modificato\n\nCorpo aggiornato');
  await builder.handleFileEvent('change', addedPath);
  assert.match(builder.readGenerated('guide/added.html').toString(), /Modificato/);
  assert.doesNotMatch(builder.read('index.html').toString(), />Aggiunto</);
  assert.equal(readDocumentManifest(builder).find(({ route }) => route === '/guide/modificato').text, 'Modificato Corpo aggiornato');

  await fs.unlink(addedPath);
  await builder.handleFileEvent('unlink', addedPath);
  assert.equal(builder.readGenerated('guide/added.html'), null);
  assert.doesNotMatch(builder.read('index.html').toString(), /\/guide\/(?:aggiunto|modificato)/);
  assert.equal(readDocumentManifest(builder).some(({ text }) => text.includes('Corpo aggiornato')), false);
});

test('crea uno snapshot di esportazione ordinato usando solo i frammenti in mem-fs', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-export-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'zeta.md'), '# Zeta');
  await fs.writeFile(path.join(sourceDirectory, 'alfa.md'), '# Alfa\n\n## Caff\u00e8');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  await fs.writeFile(path.join(sourceDirectory, 'alfa.html'), '<script>non usare</script>');
  const snapshot = builder.getExportSnapshot();

  assert.deepEqual(snapshot.documents.map(({ route }) => route), ['/alfa', '/zeta']);
  assert.deepEqual(snapshot.documents.map(({ assetBase }) => assetBase), ['/', '/']);
  assert.match(snapshot.navigation, /href="\/alfa#doc-caff%C3%A8"/);
  assert.equal((snapshot.navigation.match(/<ol/g) ?? []).length, 1);
  assert.match(snapshot.navigation, /<ul class="navigation__headings">/);
  assert.match(snapshot.documents[0].html, /<h1 id="doc-alfa">Alfa<\/h1>/);
  assert.doesNotMatch(snapshot.documents[0].html, /non usare|<script>/);
});

test('isola frammenti generati e HTML authored durante build, add, change e unlink', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-collision-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'keep.md'), '# Keep');
  const markdownPath = path.join(sourceDirectory, 'page.md');
  const authoredHtmlPath = path.join(sourceDirectory, 'page.html');
  await fs.writeFile(markdownPath, '# Pagina\n\n<script>markdownUnsafe()</script>');
  await fs.writeFile(authoredHtmlPath, '<script>authoredInitial()</script>');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  assert.match(builder.read('page.html').toString(), /authoredInitial/);
  assert.match(builder.readGenerated('page.html').toString(), /id="doc-pagina"/);
  assert.doesNotMatch(builder.readGenerated('page.html').toString(), /markdownUnsafe|<script>/);
  assert.doesNotMatch(builder.getExportSnapshot().documents.find(({ route }) => route === '/pagina').html, /authoredInitial|markdownUnsafe|<script>/);

  await fs.writeFile(authoredHtmlPath, '<script>authoredChanged()</script>');
  await builder.handleFileEvent('change', authoredHtmlPath);
  assert.match(builder.read('page.html').toString(), /authoredChanged/);
  assert.match(builder.readGenerated('page.html').toString(), /id="doc-pagina"/);

  await fs.unlink(authoredHtmlPath);
  await builder.handleFileEvent('unlink', authoredHtmlPath);
  assert.equal(builder.read('page.html'), null);
  assert.match(builder.readGenerated('page.html').toString(), /id="doc-pagina"/);

  await fs.writeFile(authoredHtmlPath, '<script>authoredAdded()</script>');
  await builder.handleFileEvent('add', authoredHtmlPath);
  assert.match(builder.read('page.html').toString(), /authoredAdded/);
  assert.match(builder.readGenerated('page.html').toString(), /id="doc-pagina"/);

  await fs.writeFile(markdownPath, '# Pagina aggiornata');
  await builder.handleFileEvent('change', markdownPath);
  assert.match(builder.read('page.html').toString(), /authoredAdded/);
  assert.match(builder.readGenerated('page.html').toString(), /Pagina aggiornata/);

  await fs.unlink(markdownPath);
  await builder.handleFileEvent('unlink', markdownPath);
  assert.match(builder.read('page.html').toString(), /authoredAdded/);
  assert.equal(builder.readGenerated('page.html'), null);
  assert.equal(builder.routeToHtmlPath('/pagina-aggiornata'), null);
});

test('ordina totalmente e deterministicamente path che differiscono solo per case', () => {
  assert.deepEqual(
    ['page.md', 'Page.md', 'PAGE.md', 'alpha.md'].sort(compareDocumentPaths),
    ['alpha.md', 'PAGE.md', 'Page.md', 'page.md']
  );

  const builder = new SiteBuilder({ sourceDirectory: '/tmp/document-order' });
  for (const relativePath of ['page.md', 'Page.md', 'PAGE.md']) {
    builder.documents.set(relativePath, {
      relativePath,
      baseRoute: '/pagina',
      sourceRoute: `/${relativePath.slice(0, -3)}`,
      title: relativePath,
      headings: [],
      htmlPath: relativePath.replace(/\.md$/, '.html')
    });
  }

  const documents = builder.getDocuments();
  assert.deepEqual(documents.map(({ relativePath }) => relativePath), ['PAGE.md', 'Page.md', 'page.md']);
  assert.deepEqual(documents.map(({ route }) => route), ['/pagina', '/pagina-2', '/pagina-3']);
  builder.template = '<!-- NAVIGATION --><!-- DOCUMENT_MANIFEST -->';
  builder.renderShell();
  assert.deepEqual(readDocumentManifest(builder).map(({ route }) => route), ['/pagina', '/pagina-2', '/pagina-3']);
});

test('assegna canoniche prima degli alias e scarta deterministicamente alias collidenti', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-route-collision-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'a.md'), '# Bar');
  await fs.writeFile(path.join(sourceDirectory, 'bar.md'), '# Baz');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const documents = builder.getDocuments();
  assert.deepEqual(documents.map(({ route, aliases }) => ({ route, aliases })), [
    { route: '/bar', aliases: ['/a'] },
    { route: '/baz', aliases: [] }
  ]);
  assert.equal(builder.routeToHtmlPath('/bar'), 'a.html');
  assert.equal(builder.routeToHtmlPath('/baz'), 'bar.html');
  assert.deepEqual(builder.getExportSnapshot().documents.map(({ route, aliases }) => ({ route, aliases })), [
    { route: '/bar', aliases: ['/a'] },
    { route: '/baz', aliases: [] }
  ]);
});

test('non usa come suffisso una route canonica riservata', () => {
  const builder = new SiteBuilder({ sourceDirectory: '/tmp/canonical-route-order' });
  const entries = [
    ['a.md', '/foo'],
    ['b.md', '/foo'],
    ['c.md', '/foo-2']
  ];
  for (const [relativePath, baseRoute] of entries) {
    builder.documents.set(relativePath, {
      relativePath,
      baseRoute,
      sourceRoute: `/${relativePath.slice(0, -3)}`,
      title: relativePath,
      headings: [],
      htmlPath: relativePath.replace(/\.md$/, '.html')
    });
  }

  assert.deepEqual(builder.getDocuments().map(({ route }) => route), ['/foo', '/foo-3', '/foo-2']);
});

test('codifica la base asset derivata da directory sorgente con caratteri URL', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-asset-base-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  const documentDirectory = path.join(sourceDirectory, 'guida # caff\u00e8');
  await fs.mkdir(documentDirectory);
  await fs.writeFile(path.join(documentDirectory, 'page.md'), '# Pagina');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  assert.equal(builder.getExportSnapshot().documents[0].assetBase, '/guida%20%23%20caff%C3%A8/');
});

test('disambigua canoniche NFC e NFD nello stesso spazio URL normalizzato', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-unicode-routes-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  await fs.writeFile(path.join(sourceDirectory, 'a.md'), '# Caf\u00e9');
  await fs.writeFile(path.join(sourceDirectory, 'b.md'), '# Cafe\u0301');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const documents = builder.getDocuments();
  assert.deepEqual(documents.map(({ route }) => route), ['/caf%C3%A9', '/caf%C3%A9-2']);
  assert.equal(builder.routeToHtmlPath('/cafe%CC%81'), 'a.html');
  assert.equal(builder.routeToHtmlPath('/caf%C3%A9-2'), 'b.html');
  assert.match(builder.read('index.html').toString(), /href="\/caf%C3%A9"/);
  assert.match(builder.read('index.html').toString(), /href="\/caf%C3%A9-2"/);
});

test('scarta un alias NFD che collide con una canonica NFC', () => {
  const builder = new SiteBuilder({ sourceDirectory: '/tmp/unicode-alias-collision' });
  builder.documents.set('a.md', {
    relativePath: 'a.md', baseRoute: '/caf%C3%A9', sourceRoute: '/a', title: 'Caf\u00e9', headings: [], htmlPath: 'a.html'
  });
  builder.documents.set('b.md', {
    relativePath: 'b.md', baseRoute: '/altro', sourceRoute: '/cafe%CC%81', title: 'Altro', headings: [], htmlPath: 'b.html'
  });

  assert.deepEqual(builder.getDocuments().map(({ route, aliases }) => ({ route, aliases })), [
    { route: '/caf%C3%A9', aliases: ['/a'] },
    { route: '/altro', aliases: [] }
  ]);
});

test('serializza directory e alias con caratteri riservati come segmenti URL', async (context) => {
  const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-special-route-'));
  context.after(() => fs.rm(sourceDirectory, { recursive: true, force: true }));
  const directory = path.join(sourceDirectory, 'guide #1?');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'source %.md'), '# Pagina');
  const builder = new SiteBuilder({ sourceDirectory });
  await builder.build();

  const [document] = builder.getDocuments();
  assert.equal(document.route, '/guide%20%231%3F/pagina');
  assert.deepEqual(document.aliases, ['/guide%20%231%3F/source%20%25']);
  assert.equal(builder.routeToHtmlPath('/guide%20%231%3F/pagina'), path.join('guide #1?', 'source %.html'));
  const shell = builder.read('index.html').toString();
  assert.match(shell, /href="\/guide%20%231%3F\/pagina"/);
  assert.match(shell, /"route":"\/guide%20%231%3F\/pagina"/);
  assert.doesNotMatch(shell, /href="\/guide #1\?/);
});
