import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

test('include controlli accessibili, tema pre-paint e progress bar', async () => {
  const shell = await fs.readFile(new URL('../core/web/index.template.html', import.meta.url), 'utf8');
  assert.equal((shell.match(/<!-- PROJECT_TITLE -->/g) ?? []).length, 2);
  assert.equal((shell.match(/<!-- PROJECT_LOGO -->/g) ?? []).length, 1);
  assert.match(shell, /<title><!-- PROJECT_TITLE --><\/title>/);
  assert.match(shell, /class="app-header__brand"[^>]*>[^]*<!-- PROJECT_LOGO -->[^]*class="app-header__title"><!-- PROJECT_TITLE --><\/span>[^]*<\/a>/);
  assert.match(shell, /id="menu-toggle"[^>]*aria-controls="app-sidebar"[^>]*aria-expanded="false"/);
  assert.match(shell, /id="search-launcher"[^>]*type="search"[^>]*readonly[^>]*aria-haspopup="dialog"[^>]*aria-controls="search-dialog"/);
  assert.match(shell, /id="search-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(shell, /id="search-input"[^>]*role="combobox"[^>]*aria-controls="search-results"/);
  assert.match(shell, /id="search-clear"[^>]*type="button"[^>]*aria-label="Cancella ricerca"[^>]*hidden/);
  assert.match(shell, /id="search-results"[^>]*role="listbox"/);
  assert.match(shell, /id="theme-toggle"[^>]*aria-label="Attiva tema scuro"/);
  assert.match(shell, /id="pdf-export"[^>]*aria-describedby="pdf-export-status"[^>]*>Esporta PDF<\/button>/);
  assert.match(shell, /id="pdf-export-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(shell, /id="print-export"[^>]*aria-hidden="true"/);
  assert.match(shell, /id="reading-progress"[^>]*role="progressbar"/);
  assert.match(shell, /<script src="\/theme-init\.js"><\/script>[^]*<link rel="stylesheet"/);
});

test('mantiene invariata l’icona search-outline di Ionicons 8.0.13', async () => {
  const icon = await fs.readFile(new URL('../core/web/icons/ionicons/search-outline.svg', import.meta.url));
  const notice = await fs.readFile(new URL('../core/web/icons/ionicons/NOTICE.txt', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(icon).digest('hex'), 'eeb8d961170c6c4c6133c2249ad8f203b2ee1716fd8f965d771d06d9724ac060');
  assert.match(notice, /Ionicons 8\.0\.13/);
  assert.match(notice, /search-outline\.svg/);
});

test('mantiene invariata l’icona close-outline di Ionicons 8.0.13', async () => {
  const icon = await fs.readFile(new URL('../core/web/icons/ionicons/close-outline.svg', import.meta.url));
  const notice = await fs.readFile(new URL('../core/web/icons/ionicons/NOTICE.txt', import.meta.url), 'utf8');
  assert.equal(createHash('sha256').update(icon).digest('hex'), '9b0157f1a27d431e6d933de10ac86d556251416d879536d8e246627407299a79');
  assert.match(notice, /close-outline\.svg/);
});

test('documents content directories and the reserved runtime files', async () => {
  const readme = await fs.readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /easy-mark serve \.\/doc/);
  assert.match(readme, /easy-mark export \.\/doc --pdf \.\/guide\.pdf/);
  assert.match(readme, /The manifest is optional/);
  assert.match(readme, /cannot replace them with its own `index\.html` or `styles\.css`/);
  assert.doesNotMatch(readme, /Esempio HTML alternativo|<!-- NAVIGATION -->|<!-- DOCUMENT_MANIFEST -->/);
});

test('collega il clear button al controller search del runtime', async () => {
  const app = await fs.readFile(new URL('../core/web/app.js', import.meta.url), 'utf8');
  assert.match(app, /clearButton:\s*document\.querySelector\('#search-clear'\)/);
});
