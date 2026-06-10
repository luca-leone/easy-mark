import test from 'node:test';
import assert from 'node:assert/strict';
import { hashToElementId } from '../core/web/url.js';

test('decodifica gli anchor Unicode per getElementById', () => {
  assert.equal(hashToElementId('#doc-funzionalit%C3%A0'), 'doc-funzionalità');
});

test('gestisce hash vuoti o non validamente codificati', () => {
  assert.equal(hashToElementId(''), '');
  assert.equal(hashToElementId('#sezione%'), 'sezione%');
});
