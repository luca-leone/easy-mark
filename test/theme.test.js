import test from 'node:test';
import assert from 'node:assert/strict';
import { oppositeTheme, resolveTheme } from '../core/web/theme.js';

test('risolve prima la preferenza salvata e poi quella di sistema', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme('invalid', false), 'light');
});

test('alterna il tema', () => {
  assert.equal(oppositeTheme('dark'), 'light');
  assert.equal(oppositeTheme('light'), 'dark');
});
