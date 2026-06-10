import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMarkdown } from '../core/server/markdown.js';

test('compila GFM, genera slug e riscrive i link Markdown', async () => {
  const result = await compileMarkdown('# Titolo\n\n| A |\n| - |\n| B |\n\n[Altro](../other.md#sezione)', 'guide/page.md');
  assert.match(result.html, /<h1 id="doc-titolo">Titolo<\/h1>/);
  assert.match(result.html, /<table>/);
  assert.match(result.html, /href="\/other#sezione"/);
  assert.equal(result.title, 'Titolo');
  assert.equal(result.route, '/guide/titolo');
  assert.equal(result.sourceRoute, '/guide/page');
});

test('sanitizza HTML pericoloso', async () => {
  const result = await compileMarkdown('<script>alert(1)</script><p onclick="alert(1)">Test</p>', 'page.md');
  assert.doesNotMatch(result.html, /script|onclick/);
  assert.match(result.html, /<p>Test<\/p>/);
});

test('preserva attributi IDREF accessibili sanitizzati', async () => {
  const markdown = [
    '<div id="label">Label</div>',
    '',
    '<div id="panel" aria-labelledby="label other" aria-describedby="label" aria-controls="panel" aria-owns="panel label">Panel</div>',
    '',
    '<label for="field">Field</label>',
    '',
    '<input id="field">',
    '',
    '<table><tr><th id="head">Head</th><td headers="head other">Value</td></tr></table>'
  ].join('\n');
  const result = await compileMarkdown(markdown, 'page.md');

  assert.match(result.html, /id="doc-label"/);
  assert.match(result.html, /aria-labelledby="doc-label doc-other"/);
  assert.match(result.html, /aria-describedby="doc-label"/);
  assert.match(result.html, /aria-controls="panel"/);
  assert.match(result.html, /aria-owns="panel label"/);
  assert.match(result.html, /<label for="field">Field<\/label>/);
  assert.match(result.html, /headers="head other"/);
});

test('serializza route canonica e alias per segmenti sorgente speciali', async () => {
  const result = await compileMarkdown('# Caf\u00e9 100%', 'guide #1?/source %.md');
  assert.equal(result.route, '/guide%20%231%3F/caf%C3%A9-100');
  assert.equal(result.sourceRoute, '/guide%20%231%3F/source%20%25');
});
