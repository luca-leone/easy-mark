import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('include controlli accessibili, tema pre-paint e progress bar', async () => {
  const shell = await fs.readFile(new URL('../core/web/index.template.html', import.meta.url), 'utf8');
  assert.match(shell, /<title>easy-mark<\/title>/);
  assert.match(shell, /class="app-header__brand"[^>]*>easy-mark<\/a>/);
  assert.match(shell, /id="menu-toggle"[^>]*aria-controls="app-sidebar"[^>]*aria-expanded="false"/);
  assert.match(shell, /id="theme-toggle"[^>]*aria-label="Attiva tema scuro"/);
  assert.match(shell, /id="pdf-export"[^>]*aria-describedby="pdf-export-status"[^>]*>Esporta PDF<\/button>/);
  assert.match(shell, /id="pdf-export-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(shell, /id="print-export"[^>]*aria-hidden="true"/);
  assert.match(shell, /id="reading-progress"[^>]*role="progressbar"/);
  assert.match(shell, /<script src="\/theme-init\.js"><\/script>[^]*<link rel="stylesheet"/);
});
