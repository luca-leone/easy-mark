import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCliEntrypoint, runCli } from '../bin/easy-mark.mjs';

test('CLI serve risolve directory, title e port senza supportare build', async () => {
  const calls = [];
  const runtime = await runCli(['serve', './doc', '--title', 'Docs CLI', '--port', '3210'], {
    serve: async (options) => {
      calls.push(options);
      return { close() {} };
    },
    logger: { log() {} }
  });

  assert.equal(runtime.close instanceof Function, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sourceDirectory, path.resolve('./doc'));
  assert.equal(calls[0].title, 'Docs CLI');
  assert.equal(calls[0].port, 3210);

  await assert.rejects(
    runCli(['build', './doc', '--out', './dist'], { logger: { log() {} } }),
    /Unknown option '--out'|Comando non supportato: build/
  );
});

test('CLI export richiede --pdf e passa title al runner PDF', async () => {
  const calls = [];
  await runCli(['export', './manuale', '--pdf', './bignami.pdf', '--title', 'Ignored by manifest if present'], {
    exportToPdf: async (options) => calls.push(options),
    logger: { log: (...values) => calls.push({ log: values.join(' ') }) }
  });

  assert.equal(calls[0].sourceDirectory, path.resolve('./manuale'));
  assert.equal(calls[0].pdfPath, path.resolve('./bignami.pdf'));
  assert.equal(calls[0].title, 'Ignored by manifest if present');
  assert.match(calls[1].log, /PDF scritto/);

  await assert.rejects(
    runCli(['export', './manuale'], { logger: { log() {} } }),
    /export richiede --pdf/
  );
});

test('CLI riconosce il bin anche quando npm lo esegue tramite symlink', async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'easy-mark-bin-link-'));
  context.after(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  const realEntrypoint = fileURLToPath(new URL('../bin/easy-mark.mjs', import.meta.url));
  const linkedEntrypoint = path.join(temporaryDirectory, 'easy-mark');
  await fs.symlink(realEntrypoint, linkedEntrypoint);

  assert.equal(isCliEntrypoint(linkedEntrypoint, new URL('../bin/easy-mark.mjs', import.meta.url).href), true);
});
