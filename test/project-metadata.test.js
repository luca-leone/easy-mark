import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProjectMetadata,
  defaultProjectMetadata,
  parseProjectMetadata
} from '../core/server/project-metadata.js';

test('valida e normalizza il titolo del progetto', () => {
  assert.deepEqual(parseProjectMetadata('{"title":"  Documentazione API  ","future":true}'), {
    title: 'Documentazione API',
    logo: '/logo.svg'
  });
  assert.deepEqual(parseProjectMetadata('{"title":"Docs","logo":"/brand/logo caffè.svg"}'), {
    title: 'Docs',
    logo: '/brand/logo%20caff%C3%A8.svg'
  });
  assert.deepEqual(parseProjectMetadata('{"logo":"/logo.svg"}', {
    fallbackMetadata: { title: 'CLI Docs', logo: null }
  }), {
    title: 'CLI Docs',
    logo: '/logo.svg'
  });
  assert.deepEqual(defaultProjectMetadata, { title: 'Easy Mark', logo: '/logo.svg' });
  assert.deepEqual(createDefaultProjectMetadata('  CLI Docs  '), { title: 'CLI Docs', logo: '/logo.svg' });
});

test('rifiuta manifest malformati o senza titolo valido', () => {
  assert.throws(() => parseProjectMetadata('{'), /JSON non valido/);
  assert.throws(() => parseProjectMetadata('[]'), /radice deve essere un oggetto/);
  assert.throws(() => parseProjectMetadata('{"title":"   "}'), /title deve essere una stringa non vuota/);
  assert.throws(() => parseProjectMetadata('{"title":42}'), /title deve essere una stringa non vuota/);
  for (const logo of ['logo.svg', '//host/logo.svg', '/a/../logo.svg', '/%2e%2e/logo.svg', '/__private/logo.svg', '/logo.svg?x=1', '/logo.txt', '/logo%ZZ.svg']) {
    assert.throws(() => parseProjectMetadata(JSON.stringify({ title: 'Docs', logo })), /manifest\.json: logo/);
  }
  assert.throws(() => createDefaultProjectMetadata('   '), /--title deve essere una stringa non vuota/);
});
