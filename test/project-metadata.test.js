import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProjectMetadata, parseProjectMetadata } from '../core/server/project-metadata.js';

test('valida e normalizza il titolo del progetto', () => {
  assert.deepEqual(parseProjectMetadata('{"title":"  Documentazione API  ","future":true}'), {
    title: 'Documentazione API'
  });
  assert.deepEqual(defaultProjectMetadata, { title: 'easy-mark' });
});

test('rifiuta manifest malformati o senza titolo valido', () => {
  assert.throws(() => parseProjectMetadata('{'), /JSON non valido/);
  assert.throws(() => parseProjectMetadata('[]'), /radice deve essere un oggetto/);
  assert.throws(() => parseProjectMetadata('{}'), /title deve essere una stringa non vuota/);
  assert.throws(() => parseProjectMetadata('{"title":"   "}'), /title deve essere una stringa non vuota/);
  assert.throws(() => parseProjectMetadata('{"title":42}'), /title deve essere una stringa non vuota/);
});
