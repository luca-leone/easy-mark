import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { runGit, validateCommitMessage } from './validate-commit-message.mjs';

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

function parseConventionalHeader(message) {
  const [subject] = String(message).split(/\r?\n/);
  const match = subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?: /);
  if (!match) return { type: 'chore', breaking: false };
  return {
    type: match[1],
    scope: match[2],
    breaking: Boolean(match[3]) || /\n\nBREAKING(?: CHANGE|-CHANGE): /.test(String(message))
  };
}

function incrementVersion(version, bump) {
  const match = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  return version;
}

function parseSemverTag(tag) {
  const match = String(tag ?? '').match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return undefined;
  return {
    version: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
    parts: [Number(match[1]), Number(match[2]), Number(match[3])]
  };
}

function compareSemverParts(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function highestVersion(currentVersion, existingTags = []) {
  const versions = [];
  const current = parseSemverTag(`v${currentVersion}`);
  if (current) versions.push(current);
  for (const tag of existingTags) {
    const parsed = parseSemverTag(tag);
    if (parsed) versions.push(parsed);
  }
  return versions.sort((left, right) => compareSemverParts(left.parts, right.parts)).at(-1)?.version;
}

export function proposeVersioning(message, currentVersion, existingTags = []) {
  const header = parseConventionalHeader(message);
  const bump = header.breaking ? 'major'
    : header.type === 'feat' ? 'minor'
      : header.type === 'fix' ? 'patch'
        : header.type === 'build' && header.scope === 'package' ? 'patch'
          : 'none';
  const baseVersion = highestVersion(currentVersion, existingTags) ?? currentVersion;
  const nextVersion = bump === 'none' ? currentVersion : incrementVersion(baseVersion, bump);
  return {
    bump,
    currentVersion,
    nextVersion,
    tag: nextVersion && bump !== 'none' ? `v${nextVersion}` : undefined
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

async function readPackageVersion(repositoryRoot) {
  try {
    const packageManifest = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
    return packageManifest.version;
  } catch {
    return undefined;
  }
}

function readSemverTags(repositoryRoot, gitRunner) {
  const result = runGitChecked(['tag', '--list', 'v[0-9]*.[0-9]*.[0-9]*'], {
    cwd: repositoryRoot,
    gitRunner
  });
  return result.stdout.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean);
}

export async function autoTaskCommit(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const gitRunner = options.gitRunner ?? runGit;

  runGitChecked(['add', '--all'], { cwd: repositoryRoot, gitRunner });
  const diffResult = runGitChecked(['diff', '--cached', '--name-only', '-z'], { cwd: repositoryRoot, gitRunner });
  const files = parseNullSeparated(diffResult.stdout);
  const existingTags = options.existingTags ?? readSemverTags(repositoryRoot, gitRunner);
  const plan = deriveCommitPlan(files, {
    message: options.message,
    currentVersion: options.currentVersion ?? await readPackageVersion(repositoryRoot),
    existingTags
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
    tagPushCommand: plan.versionProposal.tag ? `git push origin ${plan.versionProposal.tag}` : undefined,
    sha: shaResult.stdout.trim(),
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
