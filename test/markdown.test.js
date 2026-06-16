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
  assert.equal(result.searchText, 'Titolo A B Altro');
});

test('sanitizza HTML pericoloso', async () => {
  const result = await compileMarkdown('<script>alert(1)</script><p onclick="alert(1)">Test</p>', 'page.md');
  assert.doesNotMatch(result.html, /script|onclick/);
  assert.match(result.html, /<p>Test<\/p>/);
  assert.equal(result.searchText, 'Test');
});

test('estrae testo ricercabile solo dal tree HAST sanitizzato', async () => {
  const markdown = [
    '# Café',
    '',
    'Testo **forte** e `codice()` con [link visibile](https://example.test/segreto).',
    '',
    'Prima riga<br>Seconda riga',
    '',
    '| Colonna A | Colonna B |',
    '| --- | --- |',
    '| Uno | Due |',
    '',
    '<div>HTML <em>consentito</em></div>',
    '<script>contenuto pericoloso</script>',
    '<img src="/interno/segreto.png" alt="attributo non visibile">',
    '<!-- commento invisibile -->'
  ].join('\n');
  const result = await compileMarkdown(markdown, 'private/internal-name.md');

  assert.equal(
    result.searchText,
    'Café Testo forte e codice() con link visibile. Prima riga Seconda riga Colonna A Colonna B Uno Due HTML consentito'
  );
  assert.doesNotMatch(result.searchText, /example|segreto|pericoloso|attributo|commento|internal-name/);
});

test('mantiene Unicode e whitespace visibile collassato nel testo ricercabile', async () => {
  const result = await compileMarkdown('## Cafe\u0301\n\nA\t\nB\n\n<div>C\nD</div>', 'page.md');
  assert.equal(result.searchText, 'Cafe\u0301 A B C D');
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

test('serializza fence Mermaid e Chart.js come visual sicuri senza indicizzarne il sorgente', async () => {
  const markdown = [
    '```mermaid',
    'flowchart TD',
    '  A --> B',
    '```',
    '',
    '```chart',
    '{"type":"donut","title":"Revenue","data":{"labels":["Core"],"datasets":[{"data":[1]}]}}',
    '```'
  ].join('\n');
  const result = await compileMarkdown(markdown, 'visuals.md');

  assert.match(result.html, /class="visual visual--mermaid"/);
  assert.match(result.html, /data-visual-kind="mermaid"/);
  assert.match(result.html, /data-visual-source="flowchart TD\s+A --> B"/);
  assert.match(result.html, /class="visual visual--chart"/);
  assert.match(result.html, /data-visual-title="Revenue"/);
  assert.match(result.html, /role="img" aria-label="Revenue"/);
  assert.equal(result.searchText, 'Mermaid diagram Revenue');
  assert.doesNotMatch(result.searchText, /flowchart|datasets|Core/);
});
