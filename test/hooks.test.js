import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { installHooks } from '../script/git/install-hooks.mjs';

const rootDirectory = path.resolve(import.meta.dirname, '..');
const installerPath = path.join(rootDirectory, 'script', 'git', 'install-hooks.mjs');
const gitEnvironment = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test Author',
  GIT_COMMITTER_EMAIL: 'test@example.com'
};

function git(repository, ...argumentsList) {
  return spawnSync('git', ['-C', repository, ...argumentsList], { encoding: 'utf8', env: gitEnvironment });
}

function commit(repository, message) {
  return git(repository, '-c', 'commit.gpgSign=false', 'commit', '-m', message);
}

async function createRepository(context) {
  const repository = await fs.mkdtemp(path.join(os.tmpdir(), 'commit-hooks-'));
  context.after(() => fs.rm(repository, { recursive: true, force: true }));
  assert.equal(git(repository, 'init', '--quiet').status, 0);

  await fs.mkdir(path.join(repository, 'hooks', 'git'), { recursive: true });
  await fs.mkdir(path.join(repository, 'script', 'git'), { recursive: true });
  await fs.copyFile(path.join(rootDirectory, 'hooks', 'git', 'commit-msg'), path.join(repository, 'hooks', 'git', 'commit-msg'));
  await fs.copyFile(
    path.join(rootDirectory, 'script', 'git', 'validate-commit-message.mjs'),
    path.join(repository, 'script', 'git', 'validate-commit-message.mjs')
  );
  await fs.chmod(path.join(repository, 'hooks', 'git', 'commit-msg'), 0o755);
  return repository;
}

async function runHook(repository, message, environment = gitEnvironment) {
  const messageFile = path.join(repository, 'COMMIT_EDITMSG.test');
  await fs.writeFile(messageFile, message);
  return spawnSync(path.join(repository, 'hooks', 'git', 'commit-msg'), [messageFile], {
    cwd: repository,
    encoding: 'utf8',
    env: environment
  });
}

test('versioned commit-msg hook is executable and uses LF endings', async () => {
  const hookPath = path.join(rootDirectory, 'hooks', 'git', 'commit-msg');
  const [contents, stats] = await Promise.all([fs.readFile(hookPath), fs.stat(hookPath)]);
  assert.equal(contents.includes(Buffer.from('\r\n')), false);
  assert.notEqual(stats.mode & 0o111, 0);
});

test('installer module can be imported without a CLI script argument', () => {
  const moduleUrl = pathToFileURL(installerPath).href;
  const result = spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    `await import(${JSON.stringify(moduleUrl)})`
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('installer configures an absent path and remains idempotent before HEAD', async (context) => {
  const repository = await createRepository(context);
  assert.notEqual(git(repository, 'rev-parse', '--verify', 'HEAD').status, 0);

  assert.deepEqual(installHooks(repository), { repositoryRoot: repository, hooksPath: 'hooks/git', changed: true });
  assert.deepEqual(installHooks(repository), { repositoryRoot: repository, hooksPath: 'hooks/git', changed: false });

  const cliResult = spawnSync(process.execPath, [installerPath], { cwd: repository, encoding: 'utf8' });
  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.match(cliResult.stdout, /Already configured core\.hooksPath=hooks\/git/);
});

test('installer refuses to overwrite a different effective hooks path', async (context) => {
  const repository = await createRepository(context);
  assert.equal(git(repository, 'config', '--local', 'core.hooksPath', '.husky').status, 0);
  assert.throws(() => installHooks(repository), /Refusing to replace effective core\.hooksPath=\.husky/);

  const cliResult = spawnSync(process.execPath, [installerPath], { cwd: repository, encoding: 'utf8' });
  assert.equal(cliResult.status, 1);
  assert.match(cliResult.stderr, /Remove or change it explicitly/);
  assert.equal(git(repository, 'config', '--local', '--get', 'core.hooksPath').stdout.trim(), '.husky');
});

test('installer refuses an effective global hooks path without writing local config', () => {
  const calls = [];
  const runner = (argumentsList) => {
    calls.push(argumentsList);
    if (argumentsList[0] === 'config' && argumentsList[1] === '--get') {
      return { status: 0, stdout: '.global-hooks\n', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };

  assert.throws(() => installHooks('/repo', runner), /effective core\.hooksPath=\.global-hooks/);
  assert.equal(calls.some((argumentsList) => argumentsList.includes('--local')), false);
});

test('real hook follows strip, whitespace, scissors, verbatim, and custom commentChar', async (context) => {
  const repository = await createRepository(context);
  installHooks(repository);
  assert.equal(git(repository, 'config', 'core.commentChar', ';').status, 0);

  assert.equal(git(repository, 'config', 'commit.cleanup', 'strip').status, 0);
  assert.equal((await runHook(repository, '; template\nfix(cli): validate custom comments\n; status')).status, 0);

  assert.equal(git(repository, 'config', 'core.commentChar', 'auto').status, 0);
  assert.equal((await runHook(repository, '# template\nfix(cli): validate automatic comments\n# status')).status, 0);
  assert.equal(git(repository, 'config', 'core.commentChar', ';').status, 0);

  assert.equal(git(repository, 'config', 'commit.cleanup', 'whitespace').status, 0);
  assert.equal((await runHook(repository, '; template\nfix(cli): validate custom comments')).status, 1);

  assert.equal(git(repository, 'config', 'commit.cleanup', 'scissors').status, 0);
  const scissors = 'fix(cli): stop at scissors\n; ------------------------ >8 ------------------------\ninvalid subject';
  assert.equal((await runHook(repository, scissors)).status, 0);

  const malformedAfterScissors = 'fix(cli): validate full unedited input\n; ------------------------ >8 ------------------------\nBREAKING CHANGE malformed';
  assert.equal((await runHook(repository, malformedAfterScissors)).status, 1);

  assert.equal(git(repository, 'config', 'commit.cleanup', 'verbatim').status, 0);
  assert.equal((await runHook(repository, '; template\nfix(cli): preserve verbatim')).status, 1);
});

test('hook follows the last effective comment alias', async (context) => {
  const repository = await createRepository(context);
  installHooks(repository);
  assert.equal(git(repository, 'config', 'commit.cleanup', 'strip').status, 0);
  assert.equal(git(repository, 'config', 'core.commentString', '//').status, 0);
  assert.equal(git(repository, 'config', 'core.commentChar', ';').status, 0);
  assert.equal((await runHook(repository, '; template\nfix(cli): honor latest comment alias')).status, 0);

  assert.equal(git(repository, 'config', '--unset', 'core.commentString').status, 0);
  assert.equal(git(repository, 'config', 'core.commentString', '//').status, 0);
  assert.equal((await runHook(repository, '// template\nfix(cli): honor updated comment alias')).status, 0);
});

test('installer respects an applicable worktree hooks path', async (context) => {
  const repository = await createRepository(context);
  assert.equal(git(repository, 'config', 'extensions.worktreeConfig', 'true').status, 0);
  assert.equal(git(repository, 'config', '--worktree', 'core.hooksPath', '.worktree-hooks').status, 0);

  assert.throws(() => installHooks(repository), /effective core\.hooksPath=\.worktree-hooks/);
  assert.equal(git(repository, 'config', '--local', '--get', 'core.hooksPath').status, 1);
});

test('hook reports a clear error when Node.js is absent from PATH', async (context) => {
  const repository = await createRepository(context);
  const result = await runHook(repository, 'fix: valid message', { ...gitEnvironment, PATH: '/usr/bin:/bin' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Node\.js 22 or later is required in PATH/);
});

test('real hook rejects a fake merge subject and accepts an actual merge commit', async (context) => {
  const repository = await createRepository(context);
  installHooks(repository);
  await fs.writeFile(path.join(repository, 'base.txt'), 'base\n');
  assert.equal(git(repository, 'add', 'base.txt').status, 0);
  assert.equal(commit(repository, 'chore: initialize repository').status, 0);

  await fs.writeFile(path.join(repository, 'fake.txt'), 'fake\n');
  assert.equal(git(repository, 'add', 'fake.txt').status, 0);
  const fakeMerge = commit(repository, "Merge branch 'not-active'");
  assert.notEqual(fakeMerge.status, 0);
  assert.match(fakeMerge.stderr, /active Git merge/);
  assert.equal(git(repository, 'reset', '--quiet', 'HEAD', 'fake.txt').status, 0);

  assert.equal(git(repository, 'checkout', '-b', 'feature', '--quiet').status, 0);
  await fs.writeFile(path.join(repository, 'feature.txt'), 'feature\n');
  assert.equal(git(repository, 'add', 'feature.txt').status, 0);
  assert.equal(commit(repository, 'feat: add feature file').status, 0);

  assert.equal(git(repository, 'checkout', '-', '--quiet').status, 0);
  await fs.writeFile(path.join(repository, 'main.txt'), 'main\n');
  assert.equal(git(repository, 'add', 'main.txt').status, 0);
  assert.equal(commit(repository, 'chore: add main file').status, 0);

  const merge = git(repository, '-c', 'commit.gpgSign=false', 'merge', '--no-ff', 'feature', '-m', "Merge branch 'feature'");
  assert.equal(merge.status, 0, merge.stderr);
  assert.equal(git(repository, 'log', '-1', '--pretty=%s').stdout.trim(), "Merge branch 'feature'");
});
