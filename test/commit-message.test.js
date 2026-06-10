import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  applyCommitCleanup,
  applyHookCleanup,
  readHookContext,
  resolveAutoCommentChar,
  validateCommitMessage
} from '../script/git/validate-commit-message.mjs';

const rootDirectory = path.resolve(import.meta.dirname, '..');
const validatorPath = path.join(rootDirectory, 'script', 'git', 'validate-commit-message.mjs');

test('accepts documented Conventional Commit and independent breaking forms', () => {
  for (const message of [
    'feat: add PDF export',
    'fix(routes): preserve encoded fragments',
    'docs!: replace public setup instructions',
    'refactor(parser): replace token model\n\nBREAKING CHANGE: token consumers must migrate',
    'build(deps)!: update incompatible toolchain\n\nBREAKING-CHANGE: Node.js 22 is required',
    'ci: verify commit messages'
  ]) {
    assert.equal(validateCommitMessage(message).valid, true, message);
  }
});

test('requires rigorously formed breaking footers', () => {
  for (const footer of [
    'BREAKING CHANGE',
    'BREAKING CHANGE:',
    'BREAKING CHANGE:value',
    'BREAKING CHANGE:  value',
    'BREAKING-CHANGE : value',
    'BREAKING-CHANGE: '
  ]) {
    assert.equal(validateCommitMessage(`feat: change API\n\n${footer}`).valid, false, footer);
  }
  assert.equal(validateCommitMessage('feat: change API\nBREAKING CHANGE: missing separator').valid, false);
});

test('accepts native revert and autosquash subjects', () => {
  assert.deepEqual(validateCommitMessage('Revert "feat: display \\"quoted\\" labels"'), { valid: true, kind: 'revert' });
  assert.deepEqual(validateCommitMessage('Revert "feat: display "quoted" labels"'), { valid: true, kind: 'revert' });
  assert.deepEqual(validateCommitMessage('fixup! fix(routes): preserve fragments'), { valid: true, kind: 'fixup' });
  assert.deepEqual(validateCommitMessage('squash! docs: explain setup'), { valid: true, kind: 'squash' });
  assert.deepEqual(validateCommitMessage('amend! feat(api): rename endpoint'), { valid: true, kind: 'amend' });
  assert.equal(validateCommitMessage('amend! feature: unsupported target').valid, false);
});

test('accepts merge subjects only with explicit active-merge context', () => {
  const message = 'Merge branch \'feature/pdf\'';
  assert.equal(validateCommitMessage(message).valid, false);
  assert.deepEqual(validateCommitMessage(message, { allowMerge: true }), { valid: true, kind: 'merge' });
  assert.equal(validateCommitMessage('Merge', { allowMerge: true }).valid, false);
  assert.equal(validateCommitMessage('Merge arbitrary text', { allowMerge: true }).valid, false);
});

test('applies strip, scissors, whitespace, verbatim, and custom comment characters', () => {
  const hashMessage = '# template\nfix(cli): validate messages\n# status';
  assert.equal(validateCommitMessage(hashMessage, { cleanupMode: 'strip' }).valid, true);
  assert.equal(validateCommitMessage(hashMessage, { cleanupMode: 'verbatim' }).valid, false);
  assert.equal(validateCommitMessage(hashMessage, { cleanupMode: 'whitespace' }).valid, false);

  const customMessage = '; template\nfix(cli): validate messages\n; status';
  assert.equal(validateCommitMessage(customMessage, { cleanupMode: 'strip', commentChar: ';' }).valid, true);
  assert.equal(validateCommitMessage(customMessage, { cleanupMode: 'strip', commentChar: '#' }).valid, false);

  const scissors = 'fix(cli): validate messages\n# ------------------------ >8 ------------------------\ninvalid subject';
  assert.equal(validateCommitMessage(scissors, { cleanupMode: 'scissors' }).valid, true);
  assert.equal(validateCommitMessage(scissors, { cleanupMode: 'verbatim' }).valid, true);
  assert.equal(applyCommitCleanup('  fix: invalid leading space  ', { mode: 'whitespace' }), '  fix: invalid leading space');
  assert.equal(resolveAutoCommentChar('# used\nfix: valid'), ';');
});

test('reads cleanup, comment, and merge context from Git', () => {
  const calls = [];
  const runner = (argumentsList) => {
    calls.push(argumentsList);
    if (argumentsList.includes('commit.cleanup')) return { status: 0, stdout: 'scissors\n', stderr: '' };
    if (argumentsList.includes('--get-regexp')) {
      return { status: 0, stdout: 'core.commentString //\ncore.commentChar ;;\n', stderr: '' };
    }
    return { status: 0, stdout: 'abc123\n', stderr: '' };
  };
  assert.deepEqual(readHookContext('/repo', runner), {
    cleanupMode: 'scissors',
    commentChar: ';;',
    allowMerge: true
  });
  assert.equal(calls.length, 3);
});

test('falls back to commentChar and does not infer Git cleanup when it is unset', () => {
  const runner = (argumentsList) => {
    if (argumentsList.includes('commit.cleanup')) return { status: 1, stdout: '', stderr: '' };
    if (argumentsList.includes('--get-regexp')) return { status: 0, stdout: 'core.commentChar ;\n', stderr: '' };
    return { status: 1, stdout: '', stderr: '' };
  };
  assert.deepEqual(readHookContext('/repo', runner), {
    cleanupMode: 'verbatim',
    commentChar: ';',
    allowMerge: false
  });
});

test('supports Git cleanup=default and treats scissors conservatively without edit context', () => {
  const defaultRunner = (argumentsList) => {
    if (argumentsList.includes('commit.cleanup')) return { status: 0, stdout: 'default\n', stderr: '' };
    if (argumentsList.includes('--get-regexp')) return { status: 1, stdout: '', stderr: '' };
    return { status: 1, stdout: '', stderr: '' };
  };
  assert.deepEqual(readHookContext('/repo', defaultRunner), {
    cleanupMode: 'default',
    commentChar: '#',
    allowMerge: false
  });
  assert.equal(validateCommitMessage('fix: preserve trailing spaces  ', { cleanupMode: 'default' }).valid, false);
  const message = 'fix: valid\n# ------------------------ >8 ------------------------\nBREAKING CHANGE malformed';
  const stripspaceRunner = (_argumentsList, options) => ({
    status: 0,
    stdout: `${options.input.trim()}\n`,
    stderr: ''
  });
  const cleaned = applyHookCleanup(
    message,
    { cleanupMode: 'scissors', commentChar: '#' },
    '/repo',
    stripspaceRunner
  );
  assert.equal(validateCommitMessage(cleaned).valid, false);
});

test('rejects malformed or unsupported messages with useful reasons', () => {
  for (const message of ['', '\uFEFFfix: hidden prefix', 'feature: add export', 'fix(scope with space): bad scope', 'squash! vague message', 'Revert feat: missing quotes', 'fix: ']) {
    const result = validateCommitMessage(message);
    assert.equal(result.valid, false, message);
    assert.ok(result.reason, message);
  }
});

test('CLI treats files and --message literally while hook mode uses Git context', async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'commit-validator-'));
  context.after(() => fs.rm(temporaryDirectory, { recursive: true, force: true }));
  const messageFile = path.join(temporaryDirectory, 'COMMIT_EDITMSG');
  await fs.writeFile(messageFile, '# template\nfix(cli): handle file input\n');

  const literalFile = spawnSync(process.execPath, [validatorPath, messageFile], { encoding: 'utf8' });
  assert.equal(literalFile.status, 1);
  const literalArgument = spawnSync(process.execPath, [validatorPath, '--message', '# template\nfix(cli): handle input'], { encoding: 'utf8' });
  assert.equal(literalArgument.status, 1);

  const valid = spawnSync(process.execPath, [validatorPath, '--message', 'fix(cli): handle input'], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
});
