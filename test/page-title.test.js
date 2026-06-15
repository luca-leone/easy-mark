import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPageTitle } from '../core/web/page-title.js';

test('combina titolo documento e progetto con fallback', () => {
  assert.equal(formatPageTitle('Introduzione', 'Manuale API'), 'Introduzione — Manuale API');
  assert.equal(formatPageTitle('', ''), 'Documentazione — Easy Mark');
});
