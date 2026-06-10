import fs from 'node:fs/promises';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ALLOWED_COMMIT_TYPES = Object.freeze([
  'feat', 'fix', 'docs', 'chore', 'test', 'refactor', 'build', 'ci'
]);
export const CLEANUP_MODES = Object.freeze(['default', 'strip', 'whitespace', 'verbatim', 'scissors']);

const conventionalHeaderPattern = new RegExp(
  `^(${ALLOWED_COMMIT_TYPES.join('|')})(?:\\(([^()\\r\\n]+)\\))?(!)?: (\\S(?:.*\\S)?)$`
);
const gitRevertPattern = /^Revert ".+"$/;
const gitMergePattern = /^Merge (?:branch|branches|remote-tracking branch|tag|commit)\s+\S.+$/;
const breakingPrefixPattern = /^BREAKING(?: CHANGE|-CHANGE)/;
const breakingFooterPattern = /^BREAKING(?: CHANGE|-CHANGE): [^\s].*$/;
const autoCommentCandidates = '#;@!$%^&|:';

function splitLines(message) {
  return String(message).replace(/\r\n?/g, '\n').split('\n');
}

function stripWhitespace(lines) {
  const cleaned = [];
  for (const line of lines) {
    const trimmed = line.replace(/[ \t]+$/g, '');
    if (trimmed === '' && cleaned.at(-1) === '') continue;
    cleaned.push(trimmed);
  }
  while (cleaned[0] === '') cleaned.shift();
  while (cleaned.at(-1) === '') cleaned.pop();
  return cleaned;
}

export function resolveAutoCommentChar(message) {
  const lines = splitLines(message);
  return [...autoCommentCandidates].find((candidate) => !lines.some((line) => line.startsWith(candidate))) ?? '#';
}

export function applyCommitCleanup(rawMessage, { mode = 'verbatim', commentChar = '#' } = {}) {
  if (!CLEANUP_MODES.includes(mode)) throw new Error(`Unsupported commit cleanup mode: ${mode}`);

  const message = String(rawMessage);
  if (mode === 'default' || mode === 'verbatim') return splitLines(message).join('\n');
  const effectiveCommentChar = commentChar === 'auto' ? resolveAutoCommentChar(message) : commentChar;
  if ([...effectiveCommentChar].length !== 1) throw new Error('core.commentChar must resolve to one character or auto');

  let lines = splitLines(message);
  if (mode === 'scissors') {
    const marker = `${effectiveCommentChar} ------------------------ >8 ------------------------`;
    const markerIndex = lines.findIndex((line) => line === marker);
    if (markerIndex !== -1) lines = lines.slice(0, markerIndex);
  } else if (mode === 'strip') {
    lines = lines.filter((line) => !line.startsWith(effectiveCommentChar));
  }

  return stripWhitespace(lines).join('\n');
}

function validateBreakingFooters(bodyLines) {
  for (const [index, line] of bodyLines.entries()) {
    if (!breakingPrefixPattern.test(line)) continue;
    if (!breakingFooterPattern.test(line)) {
      return { valid: false, reason: 'breaking footer must match BREAKING CHANGE: description or BREAKING-CHANGE: description' };
    }
    if (!bodyLines.slice(0, index).some((candidate) => candidate === '')) {
      return { valid: false, reason: 'breaking footer must be separated from the subject by a blank line' };
    }
  }
  return { valid: true };
}

function validateConventionalMessage(message, { headerOnly = false } = {}) {
  const [subject = '', ...bodyLines] = splitLines(message);
  const match = subject.match(conventionalHeaderPattern);
  if (!match) {
    return { valid: false, reason: 'header must match type(optional-scope)!: description with an allowed type' };
  }

  const scope = match[2];
  if (scope && (scope !== scope.trim() || /\s/.test(scope))) {
    return { valid: false, reason: 'scope must not contain whitespace' };
  }

  if (!headerOnly) {
    const footerResult = validateBreakingFooters(bodyLines);
    if (!footerResult.valid) return footerResult;
  }
  return { valid: true, kind: 'conventional' };
}

export function validateCommitMessage(rawMessage, options = {}) {
  const message = applyCommitCleanup(rawMessage, {
    mode: options.cleanupMode ?? 'verbatim',
    commentChar: options.commentChar ?? '#'
  });
  if (!message || splitLines(message).every((line) => line === '')) {
    return { valid: false, reason: 'commit message is empty' };
  }

  const [subject] = splitLines(message);
  if (/^Merge(?:\s|$)/.test(subject)) {
    if (!options.allowMerge) return { valid: false, reason: 'merge subjects are allowed only for an active Git merge' };
    return gitMergePattern.test(subject)
      ? { valid: true, kind: 'merge' }
      : { valid: false, reason: 'merge subject must use a recognized Git-generated form' };
  }

  if (gitRevertPattern.test(subject)) return { valid: true, kind: 'revert' };

  const autosquashMatch = subject.match(/^(fixup!|squash!|amend!)\s+(.+)$/);
  if (autosquashMatch) {
    const target = validateConventionalMessage(autosquashMatch[2], { headerOnly: true });
    return target.valid
      ? { valid: true, kind: autosquashMatch[1].slice(0, -1) }
      : { valid: false, reason: `${autosquashMatch[1]} target is not a valid Conventional Commit header` };
  }

  return validateConventionalMessage(message);
}

export function runGit(argumentsList, options = {}) {
  return spawnSync('git', argumentsList, {
    cwd: options.cwd,
    encoding: 'utf8',
    input: options.input,
    windowsHide: true
  });
}

function readGitConfig(key, repositoryRoot, gitRunner) {
  const result = gitRunner(['config', '--get', key], { cwd: repositoryRoot });
  if (result.status === 1) return undefined;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `Unable to read ${key}.`);
  return result.stdout.trim();
}

function readEffectiveCommentPrefix(repositoryRoot, gitRunner) {
  const result = gitRunner(['config', '--get-regexp', '^core\\.comment(Char|String)$'], { cwd: repositoryRoot });
  if (result.status === 1) return '#';
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to read Git comment configuration.');
  const lastEntry = result.stdout.trim().split('\n').at(-1);
  const separatorIndex = lastEntry.indexOf(' ');
  return separatorIndex === -1 ? '#' : lastEntry.slice(separatorIndex + 1);
}

export function readHookContext(repositoryRoot = process.cwd(), gitRunner = runGit) {
  const cleanupMode = readGitConfig('commit.cleanup', repositoryRoot, gitRunner) ?? 'verbatim';
  if (!CLEANUP_MODES.includes(cleanupMode)) throw new Error(`Unsupported commit.cleanup value: ${cleanupMode}`);
  const commentChar = readEffectiveCommentPrefix(repositoryRoot, gitRunner);
  const mergeResult = gitRunner(['rev-parse', '--verify', '--quiet', 'MERGE_HEAD'], { cwd: repositoryRoot });
  if (![0, 1].includes(mergeResult.status)) throw new Error(mergeResult.stderr.trim() || 'Unable to inspect merge state.');
  return { cleanupMode, commentChar, allowMerge: mergeResult.status === 0 };
}

function runStripspace(message, repositoryRoot, gitRunner, stripComments = false) {
  const argumentsList = ['stripspace'];
  if (stripComments) argumentsList.push('--strip-comments');
  const result = gitRunner(argumentsList, { cwd: repositoryRoot, input: message });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to apply Git commit cleanup.');
  return result.stdout;
}

export function applyHookCleanup(message, context, repositoryRoot = process.cwd(), gitRunner = runGit) {
  if (context.cleanupMode === 'default' || context.cleanupMode === 'verbatim') return message;
  if (context.cleanupMode === 'strip') return runStripspace(message, repositoryRoot, gitRunner, true);
  return runStripspace(message, repositoryRoot, gitRunner);
}

export async function readCliRequest(argumentsList, options = {}) {
  if (argumentsList.length === 1 && !['--message', '--hook'].includes(argumentsList[0])) {
    return { message: await fs.readFile(argumentsList[0], 'utf8'), validationOptions: {} };
  }
  if (argumentsList.length === 2 && argumentsList[0] === '--message') {
    return { message: argumentsList[1], validationOptions: {} };
  }
  if (argumentsList.length === 2 && argumentsList[0] === '--hook') {
    const repositoryRoot = options.repositoryRoot ?? process.cwd();
    const gitRunner = options.gitRunner ?? runGit;
    const context = readHookContext(repositoryRoot, gitRunner);
    const rawMessage = await fs.readFile(argumentsList[1], 'utf8');
    return {
      message: applyHookCleanup(rawMessage, context, repositoryRoot, gitRunner),
      validationOptions: { allowMerge: context.allowMerge }
    };
  }
  throw new Error('Usage: node script/git/validate-commit-message.mjs <message-file> | --message <message> | --hook <message-file>');
}

export async function runCli(argumentsList = process.argv.slice(2), options = {}) {
  const request = await readCliRequest(argumentsList, options);
  const result = validateCommitMessage(request.message, request.validationOptions);
  if (!result.valid) {
    console.error(`Invalid commit message: ${result.reason}.`);
    console.error('Expected: type(optional-scope)!: description');
    console.error(`Allowed types: ${ALLOWED_COMMIT_TYPES.join(', ')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
