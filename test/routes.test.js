import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRouteSegment, normalizeRoutePath, routeFromSegments, routeKey } from '../core/web/routes.js';

test('serializza ogni segmento senza attribuire semantica a caratteri URL', () => {
  assert.equal(encodeRouteSegment('guide #1? 100% caff\u00e8'), 'guide%20%231%3F%20100%25%20caff%C3%A8');
  assert.equal(
    routeFromSegments(['guide #1?', 'pagina 100% caff\u00e8']),
    '/guide%20%231%3F/pagina%20100%25%20caff%C3%A8'
  );
});

test('normalizza NFC e non applica doppio encoding a route serializzate', () => {
  const encoded = '/guide%20%231%3F/caf%C3%A9%25';
  assert.equal(normalizeRoutePath(encoded), encoded);
  assert.equal(routeKey('/guide%20%231%3F/cafe%CC%81%25'), encoded);
  assert.equal(normalizeRoutePath('/guide #1?/cafe\u0301%25'), encoded);
});
