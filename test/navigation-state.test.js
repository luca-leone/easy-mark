import test from 'node:test';
import assert from 'node:assert/strict';
import { currentLinkState, findDocument } from '../core/web/navigation-state.js';

const manifest = [{ route: '/introduzione', aliases: ['/README'], title: 'Introduzione' }];

test('risolve route canonica e alias basato sul nome file', () => {
  assert.equal(findDocument(manifest, '/introduzione').route, '/introduzione');
  assert.equal(findDocument(manifest, '/README').route, '/introduzione');
});

test('attiva un solo link in base alla route e alla specifica ancora', () => {
  assert.equal(currentLinkState('/introduzione', '/introduzione', ''), 'page');
  assert.equal(currentLinkState('/introduzione#doc-navigazione', '/introduzione', ''), null);
  assert.equal(currentLinkState('/introduzione', '/introduzione', '#doc-navigazione'), null);
  assert.equal(currentLinkState('/introduzione#doc-navigazione', '/introduzione', '#doc-navigazione'), 'location');
  assert.equal(currentLinkState('/introduzione#doc-altro', '/introduzione', '#doc-navigazione'), null);
});

test('risolve pathname serializzati e forme Unicode canoniche equivalenti', () => {
  const unicodeManifest = [{ route: '/guide%20%231%3F/caf%C3%A9', aliases: [], title: 'Caf\u00e9' }];
  assert.equal(findDocument(unicodeManifest, '/guide%20%231%3F/cafe%CC%81').title, 'Caf\u00e9');
  assert.equal(currentLinkState('/guide%20%231%3F/caf%C3%A9', '/guide%20%231%3F/cafe%CC%81', ''), 'page');
});
