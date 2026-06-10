import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('usa Google Sans locale con una scala tipografica leggibile', async () => {
  const styles = await fs.readFile(new URL('../core/web/styles.template.css', import.meta.url), 'utf8');
  assert.match(styles, /font-family: "Google Sans"/);
  assert.match(styles, /url\("\/fonts\/google-sans\/google-sans-latin\.woff2"\)/);
  assert.match(styles, /font-size: 18px/);
  assert.match(styles, /\[data-theme="dark"\]/);
  assert.match(styles, /@media \(max-width: 899px\)/);
  assert.match(styles, /@media \(min-width: 900px\)/);
  assert.match(styles, /body\.sidebar-collapsed \.app-layout/);
  assert.match(styles, /ionicons\/menu-outline\.svg/);
  assert.match(styles, /--navigation-gutter:\s*1\.35rem/);
  assert.match(styles, /\.app-header__menu\s*{[^}]*translateX\(calc\(var\(--navigation-gutter\) - var\(--header-inline-padding\) - var\(--menu-toggle-glyph-offset\)\)\)/s);
  assert.match(styles, /\.app-sidebar\s*{[^}]*padding:\s*1\.75rem var\(--navigation-gutter\) 3rem/s);
  assert.match(styles, /--reading-progress/);
  assert.match(styles, /@media print/);
  assert.match(styles, /body\.export-printing \.app-header, body\.export-printing \.app-layout\s*{[^}]*display:\s*none/s);
  assert.match(styles, /body\.export-printing \.print-export\s*{[^}]*display:\s*block/s);
  assert.match(styles, /body\.export-printing \.print-export__navigation\s*{[^}]*break-after:\s*page/s);
  assert.match(styles, /body\.export-printing \.print-export__document\s*{[^}]*break-before:\s*page/s);
  assert.match(styles, /@media print\s*{[^]*body\.export-printing\s*{[^}]*color-scheme:\s*light/s);
  assert.match(styles, /@media print\s*{[^]*body\.export-printing\s*{[^}]*--background:\s*#ffffff[^}]*--text:\s*#202124[^}]*--code-background:\s*#202124[^}]*--code-text:\s*#f8fafc/s);
  assert.match(styles, /\[data-theme="dark"\][^]*@media print[^]*body\.export-printing\s*{[^}]*--surface:\s*#ffffff/s);
  assert.doesNotMatch(styles, /(?:^|\})\s*\.app-header, \.app-layout\s*{[^}]*display:\s*none/s);
  assert.doesNotMatch(styles, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});
