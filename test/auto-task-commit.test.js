import test from 'node:test';
import assert from 'node:assert/strict';
import {
  autoTaskCommit,
  deriveCommitPlan,
  proposeVersioning
} from '../script/git/auto-task-commit.mjs';

test('derives deterministic Conventional Commit messages from changed paths', () => {
  assert.equal(
    deriveCommitPlan(['rules/project-rules.md', 'AGENTS.md'], { currentVersion: '1.2.3' }).message,
    'docs(governance): update governance documentation'
  );
  assert.equal(
    deriveCommitPlan(['script/git/auto-task-commit.mjs'], { currentVersion: '1.2.3' }).message,
    'chore(git): automate repository git workflow'
  );
  assert.equal(
    deriveCommitPlan(['core/server/site-builder.mjs'], { currentVersion: '1.2.3' }).message,
    'fix(runtime): update runtime behavior'
  );
});

test('proposes version bumps and tags from commit semantics without pushing', () => {
  assert.deepEqual(proposeVersioning('docs(governance): update docs', '1.2.3'), {
    bump: 'none',
    currentVersion: '1.2.3',
    nextVersion: '1.2.3',
    tag: undefined
  });
  assert.deepEqual(proposeVersioning('feat(cli): add export mode', '1.2.3'), {
    bump: 'minor',
    currentVersion: '1.2.3',
    nextVersion: '1.3.0',
    tag: 'v1.3.0'
  });
  assert.deepEqual(proposeVersioning('fix(runtime): handle reloads', '1.2.3'), {
    bump: 'patch',
    currentVersion: '1.2.3',
    nextVersion: '1.2.4',
    tag: 'v1.2.4'
  });
  assert.deepEqual(proposeVersioning('feat(api)!: replace routes', '1.2.3'), {
    bump: 'major',
    currentVersion: '1.2.3',
    nextVersion: '2.0.0',
    tag: 'v2.0.0'
  });
});

test('auto task commit stages all changes, commits, and reports proposal', async () => {
  const calls = [];
  const gitRunner = (argumentsList) => {
    calls.push(argumentsList);
    if (argumentsList.join(' ') === 'diff --cached --name-only -z') {
      return { status: 0, stdout: 'script/git/auto-task-commit.mjs\0test/auto-task-commit.test.js\0', stderr: '' };
    }
    if (argumentsList.join(' ') === 'rev-parse --short HEAD') {
      return { status: 0, stdout: 'abc1234\n', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };

  const result = await autoTaskCommit({
    repositoryRoot: '/repo',
    currentVersion: '1.0.0',
    gitRunner
  });

  assert.equal(result.committed, true);
  assert.equal(result.sha, 'abc1234');
  assert.equal(result.message, 'chore(git): automate repository git workflow');
  assert.deepEqual(calls, [
    ['add', '--all'],
    ['diff', '--cached', '--name-only', '-z'],
    ['commit', '-m', 'chore(git): automate repository git workflow'],
    ['rev-parse', '--short', 'HEAD']
  ]);
});
