import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('include controlli accessibili, tema pre-paint e progress bar', async () => {
  const shell = await fs.readFile(new URL('../core/web/index.template.html', import.meta.url), 'utf8');
  assert.equal((shell.match(/<!-- PROJECT_TITLE -->/g) ?? []).length, 2);
  assert.match(shell, /<title><!-- PROJECT_TITLE --><\/title>/);
  assert.match(shell, /class="app-header__brand"[^>]*><!-- PROJECT_TITLE --><\/a>/);
  assert.match(shell, /id="menu-toggle"[^>]*aria-controls="app-sidebar"[^>]*aria-expanded="false"/);
  assert.match(shell, /id="theme-toggle"[^>]*aria-label="Attiva tema scuro"/);
  assert.match(shell, /id="pdf-export"[^>]*aria-describedby="pdf-export-status"[^>]*>Esporta PDF<\/button>/);
  assert.match(shell, /id="pdf-export-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(shell, /id="print-export"[^>]*aria-hidden="true"/);
  assert.match(shell, /id="reading-progress"[^>]*role="progressbar"/);
  assert.match(shell, /<script src="\/theme-init\.js"><\/script>[^]*<link rel="stylesheet"/);
});

test('documenta un override HTML completo e compatibile con il runtime', async () => {
  const readme = await fs.readFile(new URL('../src/README.md', import.meta.url), 'utf8');
  const example = readme.match(/### Esempio HTML alternativo[^]*?```html\n([^]*?)\n```/)?.[1];
  assert.ok(example);

  for (const marker of [
    '<!-- PROJECT_TITLE -->',
    '<!-- NAVIGATION -->',
    '<!-- DOCUMENT_MANIFEST -->',
    'id="menu-toggle"',
    'id="app-sidebar"',
    'id="menu-close"',
    'id="sidebar-backdrop"',
    'id="content"',
    'id="theme-toggle"',
    'id="pdf-export"',
    'id="pdf-export-status"',
    'id="reading-progress"',
    'id="print-export"'
  ]) {
    assert.match(example, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.ok(example.indexOf('/theme-init.js') < example.indexOf('/styles.css'));
  assert.ok(example.indexOf('<!-- DOCUMENT_MANIFEST -->') < example.indexOf('/app.js'));
  assert.doesNotMatch(example, /<script(?![^>]*\bsrc=)[^>]*>/);
});
