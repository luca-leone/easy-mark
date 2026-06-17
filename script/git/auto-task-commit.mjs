import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { runGit, validateCommitMessage } from './validate-commit-message.mjs';
import {
  proposeVersioning,
  readVersionSources
} from '../versioning-runtime.mjs';

export { proposeVersioning } from '../versioning-runtime.mjs';

const pathRules = Object.freeze([
  { scope: 'governance', type: 'docs', test: (file) => /^(AGENTS\.md|rules\/|guardrails\/|contracts\/|evaluation\/|memory\/|doc\/adr\/|\.agents\/|\.codex\/)/.test(file) },
  { scope: 'tests', type: 'test', test: (file) => file.startsWith('test/') },
  { scope: 'git', type: 'chore', test: (file) => /^(script\/git\/|hooks\/)/.test(file) },
  { scope: 'governance', type: 'chore', test: (file) => /^script\/(governance\/|validate-governance\.mjs|validate-agentic-workflow\.mjs)/.test(file) },
  { scope: 'package', type: 'build', test: (file) => /^(package(-lock)?\.json|\.nvmrc)$/.test(file) },
  { scope: 'runtime', type: 'fix', test: (file) => /^(bin\/|core\/server\/|core\/web\/)/.test(file) },
  { scope: 'docs', type: 'docs', test: (file) => /^(README\.md|demo\/|reports\/)/.test(file) }
]);

const descriptions = Object.freeze({
  'docs:governance': 'update governance documentation',
  'test:tests': 'update test coverage',
  'chore:git': 'automate repository git workflow',
  'chore:governance': 'update governance automation',
  'build:package': 'update package metadata',
  'fix:runtime': 'update runtime behavior',
  'docs:docs': 'update documentation'
});

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareCodeUnits);
}

function classifyPath(filePath) {
  return pathRules.find((rule) => rule.test(filePath)) ?? { scope: 'workspace', type: 'chore' };
}

function highestPriorityType(classifications) {
  for (const type of ['feat', 'fix', 'build', 'chore', 'refactor', 'test', 'docs', 'ci']) {
    if (classifications.some((classification) => classification.type === type)) return type;
  }
  return 'chore';
}

function selectScope(classifications, type) {
  const matchingScopes = uniqueSorted(
    classifications
      .filter((classification) => classification.type === type)
      .map((classification) => classification.scope)
  );
  if (matchingScopes.length === 1) return matchingScopes[0];
  const allScopes = uniqueSorted(classifications.map((classification) => classification.scope));
  return allScopes.length === 1 ? allScopes[0] : 'workspace';
}

function describe(type, scope) {
  return descriptions[`${type}:${scope}`] ?? 'update repository state';
}

export function deriveCommitPlan(files, options = {}) {
  const normalizedFiles = uniqueSorted(files.map((file) => file.replaceAll(path.sep, '/')).filter(Boolean));
  if (normalizedFiles.length === 0) return { hasChanges: false };

  const classifications = normalizedFiles.map(classifyPath);
  const type = options.type ?? highestPriorityType(classifications);
  const scope = options.scope ?? selectScope(classifications, type);
  const message = options.message ?? `${type}(${scope}): ${describe(type, scope)}`;
  const validation = validateCommitMessage(message);
  const versionProposal = proposeVersioning(message, options.currentVersion, options.existingTags);

  return {
    hasChanges: true,
    files: normalizedFiles,
    message,
    type,
    scope,
    validation,
    versionProposal
  };
}

function runGitChecked(argumentsList, options = {}) {
  const result = (options.gitRunner ?? runGit)(argumentsList, { cwd: options.cwd, input: options.input });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${argumentsList.join(' ')} failed`);
  }
  return result;
}

function parseNullSeparated(output) {
  return output.split('\0').filter(Boolean);
}

export async function autoTaskCommit(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const gitRunner = options.gitRunner ?? runGit;

  runGitChecked(['add', '--all'], { cwd: repositoryRoot, gitRunner });
  const diffResult = runGitChecked(['diff', '--cached', '--name-only', '-z'], { cwd: repositoryRoot, gitRunner });
  const files = parseNullSeparated(diffResult.stdout);
  const versionSources = await readVersionSources({
    repositoryRoot,
    gitRunner,
    currentVersion: options.currentVersion,
    localTags: options.localTags ?? options.existingTags,
    remoteTags: options.remoteTags,
    remote: options.remote
  });
  const plan = deriveCommitPlan(files, {
    message: options.message,
    currentVersion: versionSources.packageVersion,
    existingTags: versionSources.tags
  });

  if (!plan.hasChanges) return { committed: false, reason: 'No staged changes after git add --all.' };
  if (!plan.validation.valid) throw new Error(`Generated commit message is invalid: ${plan.validation.reason}`);

  runGitChecked(['commit', '-m', plan.message], { cwd: repositoryRoot, gitRunner });
  const shaResult = runGitChecked(['rev-parse', '--short', 'HEAD'], { cwd: repositoryRoot, gitRunner });
  if (plan.versionProposal.tag) {
    runGitChecked(['tag', plan.versionProposal.tag], { cwd: repositoryRoot, gitRunner });
  }
  return {
    committed: true,
    tagCreated: plan.versionProposal.tag,
    tagPushCommand: plan.versionProposal.tagPushCommand,
    sha: shaResult.stdout.trim(),
    versionSources,
    ...plan
  };
}

async function runCli(argumentsList = process.argv.slice(2)) {
  const messageFlagIndex = argumentsList.indexOf('--message');
  const message = messageFlagIndex === -1 ? undefined : argumentsList[messageFlagIndex + 1];
  if (messageFlagIndex !== -1 && !message) throw new Error('Usage: node script/git/auto-task-commit.mjs [--message "type(scope): description"]');

  const result = await autoTaskCommit({ message });
  if (!result.committed) {
    console.log(result.reason);
    return 0;
  }

  console.log(`Committed ${result.sha} ${result.message}`);
  if (result.versionProposal.bump === 'none') {
    console.log('Version proposal: no package version change and no tag for this commit type.');
  } else {
    console.log(`Version proposal: ${result.versionProposal.bump} -> ${result.versionProposal.nextVersion}`);
    console.log(`Created tag: ${result.tagCreated}`);
    console.log(`Push tag: ${result.tagPushCommand}`);
  }
  console.log('Push remains manual.');
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
