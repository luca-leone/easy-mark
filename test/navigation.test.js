import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNavigation } from '../core/server/navigation.js';

test('numera i documenti e usa bullet per ogni livello di heading', () => {
  const html = renderNavigation([
    {
      route: '/guide',
      title: 'guida & uso API Node.js',
      headings: [
        { depth: 1, title: 'Guida', id: 'doc-guida' },
        { depth: 2, title: 'dettaglio API', id: 'doc-dettaglio' },
        { depth: 3, title: 'funzionalità Node.js', id: 'doc-funzionalità' },
        { depth: 1, title: 'appendice', id: 'doc-appendice' }
      ]
    },
    { route: '/introduzione', title: 'introduzione', headings: [] }
  ]);

  assert.match(html, />Guida &amp; Uso API Node.js</);
  assert.doesNotMatch(html, /#doc-guida/);
  assert.match(html, />Dettaglio API</);
  assert.match(html, />Funzionalità Node.js</);
  assert.match(html, />Appendice</);
  assert.match(html, /href="\/guide#doc-funzionalit%C3%A0"/);
  assert.equal((html.match(/<ol/g) ?? []).length, 1);
  assert.equal((html.match(/<\/ol>/g) ?? []).length, 1);
  assert.equal((html.match(/<ul/g) ?? []).length, 2);
  assert.equal((html.match(/<\/ul>/g) ?? []).length, 2);
  assert.equal((html.match(/<li/g) ?? []).length, (html.match(/<\/li>/g) ?? []).length);
  assert.match(html, /^<nav[^]*<ol>[^]*Guida &amp; Uso API Node\.js[^]*Introduzione[^]*<\/ol><\/nav>$/);
  assert.match(html, /<ul class="navigation__headings"><li><a href="\/guide#doc-dettaglio"[^]*<ul><li><a href="\/guide#doc-funzionalit%C3%A0"/);
});

test('mantiene route serializzate e codifica i fragment della navigazione', () => {
  const html = renderNavigation([{
    route: '/guide%20%231%3F/pagina%25',
    title: 'pagina speciale',
    headings: [
      { depth: 1, title: 'pagina speciale', id: 'doc-pagina-speciale' },
      { depth: 2, title: 'caff\u00e8 #?%', id: 'doc-caff\u00e8 #?%' }
    ]
  }]);

  assert.match(html, /href="\/guide%20%231%3F\/pagina%25"/);
  assert.match(html, /href="\/guide%20%231%3F\/pagina%25#doc-caff%C3%A8%20%23%3F%25"/);
  assert.doesNotMatch(html, /href="\/guide #1\?/);
});

test('mantiene il fallback titolo e capitalizza label Unicode senza mutare i dati', () => {
  const document = {
    route: '/readme',
    title: 'readme API già Pronto',
    headings: [{ depth: 2, title: '"é già" Node.js', id: 'doc-sezione' }]
  };

  const html = renderNavigation([document]);

  assert.match(html, />Readme API Già Pronto</);
  assert.match(html, />&quot;É Già&quot; Node.js</);
  assert.equal(document.title, 'readme API già Pronto');
  assert.equal(document.headings[0].title, '"é già" Node.js');
});
