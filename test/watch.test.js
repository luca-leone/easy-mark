import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileEventHandler } from '../core/server/watch.js';

test('serializza gli eventi e ricarica solo dopo ogni aggiornamento', async () => {
  const operations = [];
  const builder = {
    sourceDirectory: '/source',
    async handleFileEvent(eventName) {
      operations.push(`start:${eventName}`);
      await new Promise((resolve) => setTimeout(resolve, eventName === 'add' ? 15 : 1));
      operations.push(`end:${eventName}`);
    }
  };
  const logger = { log() {}, error() {} };
  const handleFileEvent = createFileEventHandler({
    builder,
    reload: () => operations.push('reload'),
    logger
  });

  const first = handleFileEvent('add', '/source/one.md');
  const second = handleFileEvent('change', '/source/two.md');
  await Promise.all([first, second]);

  assert.deepEqual(operations, [
    'start:add',
    'end:add',
    'reload',
    'start:change',
    'end:change',
    'reload'
  ]);
});

test('recupera la coda dopo un aggiornamento fallito', async () => {
  const operations = [];
  const builder = {
    sourceDirectory: '/source',
    async handleFileEvent(eventName) {
      if (eventName === 'change') throw new Error('failure');
      operations.push(eventName);
    }
  };
  const logger = { log() {}, error: (...values) => operations.push(values[0]) };
  const handleFileEvent = createFileEventHandler({
    builder,
    reload: () => operations.push('reload'),
    logger
  });

  await handleFileEvent('change', '/source/one.md');
  await handleFileEvent('add', '/source/two.md');

  assert.deepEqual(operations, ['Aggiornamento fallito:', 'add', 'reload']);
});
