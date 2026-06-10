import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReadingProgress } from '../core/web/reading-progress.js';

test('calcola e limita l’avanzamento del documento', () => {
  const dimensions = { documentTop: 100, documentHeight: 1100, viewportHeight: 500 };
  assert.equal(calculateReadingProgress({ ...dimensions, scrollY: 0 }), 0);
  assert.equal(calculateReadingProgress({ ...dimensions, scrollY: 400 }), 50);
  assert.equal(calculateReadingProgress({ ...dimensions, scrollY: 700 }), 100);
  assert.equal(calculateReadingProgress({ ...dimensions, scrollY: 900 }), 100);
});

test('considera completo un documento non scrollabile', () => {
  assert.equal(calculateReadingProgress({ documentTop: 0, documentHeight: 400, viewportHeight: 500, scrollY: 0 }), 100);
});
