import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { runGit } from './git/validate-commit-message.mjs';

export const DEFAULT_VERSIONING_CONTRACT_PATH = 'contracts/governance/versioning.json';

export function parseSemverTag(tag) {
  const match = String(tag ?? '').match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return undefined;
  return {
    tag: `v${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
    version: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
    parts: [Number(match[1]), Number(match[2]), Number(match[3])]
  };
}

export function compareSemverParts(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function highestVersion(currentVersion, tags = []) {
  const versions = [];
  const current = parseSemverTag(`v${currentVersion}`);
  if (current) versions.push(current);
  for (const tag of tags) {
    const parsed = parseSemverTag(tag);
    if (parsed) versions.push(parsed);
  }
  return versions.sort((left, right) => compareSemverParts(left.parts, right.parts)).at(-1)?.version;
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

export function proposeVersioning(message, currentVersion, tags = []) {
  const header = parseConventionalHeader(message);
  const bump = header.breaking ? 'major'
    : header.type === 'feat' ? 'minor'
      : header.type === 'fix' ? 'patch'
        : header.type === 'build' && header.scope === 'package' ? 'patch'
          : 'none';
  const baseVersion = highestVersion(currentVersion, tags) ?? currentVersion;
  const nextVersion = bump === 'none' ? currentVersion : incrementVersion(baseVersion, bump);
  return {
    bump,
    currentVersion,
    baseVersion,
    nextVersion,
    tag: nextVersion && bump !== 'none' ? `v${nextVersion}` : undefined,
    tagPushCommand: nextVersion && bump !== 'none' ? `git push origin v${nextVersion}` : undefined
  };
}

export async function readPackageManifest(repositoryRoot = process.cwd()) {
  return JSON.parse(await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
}

export async function readPackageVersion(repositoryRoot = process.cwd()) {
  try {
    return (await readPackageManifest(repositoryRoot)).version;
  } catch {
    return undefined;
  }
}

function runGitChecked(argumentsList, options = {}) {
  const result = (options.gitRunner ?? runGit)(argumentsList, { cwd: options.cwd, input: options.input });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${argumentsList.join(' ')} failed`);
  }
  return result;
}

export function parseRemoteTagRefs(output) {
  return String(output ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[1] ?? '')
    .map((ref) => ref.replace(/^refs\/tags\//, ''))
    .filter(Boolean);
}

export function readLocalSemverTags(repositoryRoot = process.cwd(), gitRunner = runGit) {
  const result = runGitChecked(['tag', '--list', 'v[0-9]*.[0-9]*.[0-9]*'], {
    cwd: repositoryRoot,
    gitRunner
  });
  return result.stdout.split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean);
}

export function readRemoteSemverTags(repositoryRoot = process.cwd(), gitRunner = runGit, remote = 'origin') {
  const result = runGitChecked(['ls-remote', '--tags', '--refs', remote, 'v[0-9]*.[0-9]*.[0-9]*'], {
    cwd: repositoryRoot,
    gitRunner
  });
  return parseRemoteTagRefs(result.stdout);
}

export async function readVersionSources(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
  const gitRunner = options.gitRunner ?? runGit;
  const packageVersion = options.currentVersion ?? await readPackageVersion(repositoryRoot);
  const localTags = options.localTags ?? options.existingTags ?? readLocalSemverTags(repositoryRoot, gitRunner);
  const remoteTags = options.remoteTags ?? readRemoteSemverTags(repositoryRoot, gitRunner, options.remote ?? 'origin');
  return {
    packageVersion,
    localTags,
    remoteTags,
    tags: [...localTags, ...remoteTags]
  };
}

export function sanitizePackageName(packageName) {
  return String(packageName ?? '').replace(/^@/, '').replace('/', '-');
}

export function expectedPackTarballName(packageManifest) {
  return `${sanitizePackageName(packageManifest.name)}-${packageManifest.version}.tgz`;
}

export function validatePackVersion({ packageManifest, tags = [] }) {
  const errors = [];
  const currentVersion = packageManifest?.version;
  const baseVersion = highestVersion(currentVersion, tags);
  if (!currentVersion) {
    errors.push('package.json: version is required before npm pack');
  } else if (baseVersion && baseVersion !== currentVersion) {
    errors.push(`npm pack would create ${expectedPackTarballName(packageManifest)}, but highest tag source is v${baseVersion}`);
  }
  return errors;
}

export function validateVersioningContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['contracts/governance/versioning.json: contract must be a JSON object'];
  }
  if (contract.version !== 1) errors.push('contracts/governance/versioning.json: version must be 1');
  for (const source of ['package.json', 'local-tags', 'remote-tags']) {
    if (!contract.baseSources?.includes(source)) {
      errors.push(`contracts/governance/versioning.json: baseSources missing ${source}`);
    }
  }
  if (contract.baseSelection !== 'highest-semver') {
    errors.push('contracts/governance/versioning.json: baseSelection must be highest-semver');
  }
  if (contract.tagProposal?.pushCommandTemplate !== 'git push origin <tag>') {
    errors.push('contracts/governance/versioning.json: tagProposal must print git push origin <tag>');
  }
  if (contract.pack?.requirePackageVersionEqualsTagVersion !== true) {
    errors.push('contracts/governance/versioning.json: pack must require package version/tag alignment');
  }
  return errors;
}

async function runCli(argumentsList = process.argv.slice(2)) {
  const repositoryRoot = process.cwd();
  const command = argumentsList[0] ?? 'status';
  if (command === 'validate-contract') {
    const contract = JSON.parse(await fs.readFile(path.join(repositoryRoot, DEFAULT_VERSIONING_CONTRACT_PATH), 'utf8'));
    const errors = validateVersioningContract(contract);
    if (errors.length > 0) throw new Error(errors.join('\n'));
    return 0;
  }
  if (command === 'pack-check') {
    const [packageManifest, sources] = await Promise.all([
      readPackageManifest(repositoryRoot),
      readVersionSources({ repositoryRoot })
    ]);
    const errors = validatePackVersion({ packageManifest, tags: sources.tags });
    if (errors.length > 0) throw new Error(errors.join('\n'));
    console.log(`Pack tarball: ${expectedPackTarballName(packageManifest)}`);
    return 0;
  }
  throw new Error('Usage: node script/versioning-runtime.mjs validate-contract|pack-check');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
