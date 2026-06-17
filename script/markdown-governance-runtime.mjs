import fs from 'node:fs/promises';
import path from 'node:path';
import { compareCodeUnits } from './governance/validators.mjs';
import {
  findRepositoryRoot,
  getToolName,
  parseHookPayload,
  readJsonFile,
  readStdin
} from './agentic-lean-path-runtime.mjs';

export const DEFAULT_MARKDOWN_GOVERNANCE_CONTRACT_PATH = path.join('contracts', 'governance', 'markdown-governance.json');
export const DEFAULT_MARKDOWN_GOVERNANCE_REPORT_PATH = path.join('reports', 'markdown-governance-report.jsonl');

export async function readMarkdownGovernanceContract(root, contractPath = DEFAULT_MARKDOWN_GOVERNANCE_CONTRACT_PATH) {
  return readJsonFile(path.resolve(root, contractPath));
}

export function validateMarkdownGovernanceContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['contracts/governance/markdown-governance.json: contract must be a JSON object'];
  }
  if (contract.version !== 1) errors.push('contracts/governance/markdown-governance.json: version must be 1');
  if (contract.contractName !== 'Markdown Governance') {
    errors.push('contracts/governance/markdown-governance.json: contractName must be Markdown Governance');
  }

  const governedMarkdown = contract.governedMarkdown;
  if (!governedMarkdown || typeof governedMarkdown !== 'object' || Array.isArray(governedMarkdown)) {
    errors.push('contracts/governance/markdown-governance.json: governedMarkdown is required');
  } else {
    for (const exactFile of ['AGENTS.md']) {
      if (!governedMarkdown.exactFiles?.includes(exactFile)) {
        errors.push(`contracts/governance/markdown-governance.json: governedMarkdown.exactFiles missing ${exactFile}`);
      }
    }
    for (const directory of ['.agents', 'contracts', 'doc', 'evaluation', 'guardrails', 'memory', 'reports', 'rules']) {
      if (!governedMarkdown.directories?.includes(directory)) {
        errors.push(`contracts/governance/markdown-governance.json: governedMarkdown.directories missing ${directory}`);
      }
    }
    if (governedMarkdown.extension !== '.md') {
      errors.push('contracts/governance/markdown-governance.json: governedMarkdown.extension must be .md');
    }
  }

  const rules = Array.isArray(contract.rules) ? contract.rules : [];
  const maxLineRule = rules.find((rule) => rule.id === 'markdown.max-lines');
  if (maxLineRule?.maxLines !== 150) {
    errors.push('contracts/governance/markdown-governance.json: markdown.max-lines maxLines must be 150');
  }
  const bannedModalRule = rules.find((rule) => rule.id === 'markdown.banned-modals');
  if (JSON.stringify(bannedModalRule?.bannedWords) !== JSON.stringify(['should', 'may'])) {
    errors.push('contracts/governance/markdown-governance.json: markdown.banned-modals bannedWords must be ["should","may"]');
  }
  const obligationRule = rules.find((rule) => rule.id === 'markdown.obligation-modal');
  if (obligationRule?.requiredWord !== 'must') {
    errors.push('contracts/governance/markdown-governance.json: markdown.obligation-modal requiredWord must be must');
  }

  if (!contract.hookPolicy?.semantics?.includes('not a guaranteed hard stop')) {
    errors.push('contracts/governance/markdown-governance.json: hookPolicy.semantics must avoid hard-stop assumptions');
  }
  if (!contract.hookPolicy?.violationPolicy?.includes('repair mode')) {
    errors.push('contracts/governance/markdown-governance.json: hookPolicy.violationPolicy must require repair mode');
  }
  if (contract.report?.path !== DEFAULT_MARKDOWN_GOVERNANCE_REPORT_PATH) {
    errors.push(`contracts/governance/markdown-governance.json: report.path must be ${DEFAULT_MARKDOWN_GOVERNANCE_REPORT_PATH}`);
  }
  for (const field of ['event', 'tool', 'file', 'line', 'ruleId', 'expected', 'actual', 'repairRequired']) {
    if (!contract.report?.requiredFields?.includes(field)) {
      errors.push(`contracts/governance/markdown-governance.json: report.requiredFields missing ${field}`);
    }
  }
  if (contract.repairPolicy?.script !== 'script/repair-markdown-governance.mjs') {
    errors.push('contracts/governance/markdown-governance.json: repairPolicy.script must be script/repair-markdown-governance.mjs');
  }

  return errors.sort(compareCodeUnits);
}

export async function listGovernedMarkdownFiles(root, contract) {
  const files = [];
  for (const exactFile of contract.governedMarkdown?.exactFiles ?? []) {
    const filePath = path.join(root, exactFile);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) files.push(filePath);
    } catch {
      continue;
    }
  }
  for (const directory of contract.governedMarkdown?.directories ?? []) {
    const directoryPath = path.join(root, directory);
    try {
      files.push(...await listMarkdownFiles(directoryPath, contract.governedMarkdown.extension ?? '.md'));
    } catch {
      continue;
    }
  }
  return [...new Set(files)].sort(compareCodeUnits);
}

export async function validateMarkdownGovernanceFiles(root, contract, filePaths = null) {
  const files = filePaths ?? await listGovernedMarkdownFiles(root, contract);
  const entries = await Promise.all(files.map(async (filePath) => ({
    filePath,
    relativePath: normalizeRelativePath(root, filePath),
    contents: await fs.readFile(filePath, 'utf8')
  })));
  return validateMarkdownGovernanceEntries(entries, contract);
}

export function validateMarkdownGovernanceEntries(entries, contract) {
  const errors = [];
  const rules = Array.isArray(contract?.rules) ? contract.rules : [];
  const maxLineRule = rules.find((rule) => rule.id === 'markdown.max-lines');
  const bannedModalRule = rules.find((rule) => rule.id === 'markdown.banned-modals');

  for (const entry of entries) {
    const lines = entry.contents.split('\n');
    if (Number.isInteger(maxLineRule?.maxLines) && lines.length > maxLineRule.maxLines) {
      errors.push({
        file: entry.relativePath,
        line: maxLineRule.maxLines + 1,
        ruleId: 'markdown.max-lines',
        expected: `at most ${maxLineRule.maxLines} lines`,
        actual: `${lines.length} lines`,
        repairRequired: true
      });
    }

    for (const bannedWord of bannedModalRule?.bannedWords ?? []) {
      const pattern = new RegExp(`\\b${escapeRegExp(bannedWord)}\\b`, 'gi');
      lines.forEach((lineContents, index) => {
        for (const match of lineContents.matchAll(pattern)) {
          errors.push({
            file: entry.relativePath,
            line: index + 1,
            ruleId: 'markdown.banned-modals',
            expected: 'use must for obligations or rewrite without discretionary modal wording',
            actual: match[0],
            repairRequired: true
          });
        }
      });
    }
  }

  return errors.sort((left, right) =>
    compareCodeUnits(`${left.file}:${left.line}:${left.ruleId}:${left.actual}`, `${right.file}:${right.line}:${right.ruleId}:${right.actual}`)
  );
}

export function formatMarkdownGovernanceViolation(violation) {
  return `${violation.file}:${violation.line}: ${violation.ruleId} expected ${violation.expected}; found ${violation.actual}`;
}

export function extractTouchedMarkdownFiles(payload, rawPayload, root, contract) {
  const candidates = new Set();
  collectPathCandidates(payload, candidates);
  collectPatchPathCandidates(rawPayload, candidates);
  collectPatchPayloadCandidates(payload, candidates);
  return [...candidates]
    .map((candidate) => normalizeCandidatePath(candidate))
    .filter(Boolean)
    .map((candidate) => path.resolve(root, candidate))
    .filter((candidate) => isGovernedMarkdownPath(root, candidate, contract))
    .sort(compareCodeUnits);
}

export function markdownToolCallRequiresGovernance(payload, rawPayload, root, contract) {
  const toolName = getToolName(payload);
  if (!/^(?:apply_patch|Edit|Write)$/i.test(toolName ?? '')) {
    return { required: false, reason: 'tool not governed by Markdown governance hook', files: [] };
  }
  const files = extractTouchedMarkdownFiles(payload, rawPayload, root, contract);
  return files.length === 0
    ? { required: false, reason: 'no governed Markdown file touched', files }
    : { required: true, reason: 'governed Markdown edit', files };
}

export async function appendMarkdownGovernanceReport(root, entries, reportPath = DEFAULT_MARKDOWN_GOVERNANCE_REPORT_PATH) {
  if (entries.length === 0) return;
  const absoluteReportPath = path.resolve(root, reportPath);
  await fs.mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await fs.appendFile(absoluteReportPath, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
}

export function buildMarkdownGovernanceReportEntries(payload, violations, options = {}) {
  const tool = getToolName(payload) ?? 'unknown';
  if (violations.length === 0) {
    return (options.files ?? []).map((filePath) => ({
      event: options.event ?? 'PostToolUse',
      tool,
      file: options.root ? normalizeRelativePath(options.root, filePath) : filePath,
      line: null,
      ruleId: 'markdown.governance',
      expected: 'Markdown governance contract satisfied',
      actual: 'satisfied',
      repairRequired: false
    }));
  }
  return violations.map((violation) => ({
    event: options.event ?? 'PostToolUse',
    tool,
    file: violation.file,
    line: violation.line,
    ruleId: violation.ruleId,
    expected: violation.expected,
    actual: violation.actual,
    repairRequired: violation.repairRequired === true
  }));
}

export async function runMarkdownGovernanceHook({ event }) {
  const rawPayload = await readStdin();
  const payload = parseHookPayload(rawPayload);
  const root = await findRepositoryRoot(process.cwd());
  const contractPath = process.env.MARKDOWN_GOVERNANCE_CONTRACT_PATH ?? DEFAULT_MARKDOWN_GOVERNANCE_CONTRACT_PATH;
  const reportPath = process.env.MARKDOWN_GOVERNANCE_REPORT_PATH ?? DEFAULT_MARKDOWN_GOVERNANCE_REPORT_PATH;
  const contract = await readMarkdownGovernanceContract(root, contractPath);
  const contractErrors = validateMarkdownGovernanceContract(contract);
  if (contractErrors.length > 0) {
    deny(`Markdown governance ${event} hook detected an invalid contract; enter repair mode.`, contractErrors);
  }

  const requirement = markdownToolCallRequiresGovernance(payload, rawPayload, root, contract);
  if (!requirement.required) return;
  if (event === 'PreToolUse') return;

  const violations = await validateMarkdownGovernanceFiles(root, contract, requirement.files);
  const reportEntries = buildMarkdownGovernanceReportEntries(payload, violations, {
    event,
    files: requirement.files,
    root
  });
  await appendMarkdownGovernanceReport(root, reportEntries, reportPath);
  if (violations.length > 0) {
    deny(`Markdown governance ${event} hook detected a contract violation; enter repair mode.`, violations.map(formatMarkdownGovernanceViolation));
  }
}

export async function repairMarkdownGovernanceFiles(root, contract) {
  const files = await listGovernedMarkdownFiles(root, contract);
  const changed = [];
  for (const filePath of files) {
    const original = await fs.readFile(filePath, 'utf8');
    const repaired = `${original.replace(/[ \t]+$/gm, '').replace(/\n*$/, '')}\n`;
    if (repaired !== original) {
      await fs.writeFile(filePath, repaired);
      changed.push(normalizeRelativePath(root, filePath));
    }
  }
  return changed;
}

export function normalizeRelativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function isGovernedMarkdownPath(root, filePath, contract) {
  const relativePath = normalizeRelativePath(root, filePath);
  if (!relativePath.endsWith(contract.governedMarkdown?.extension ?? '.md')) return false;
  if (contract.governedMarkdown?.exactFiles?.includes(relativePath)) return true;
  return (contract.governedMarkdown?.directories ?? []).some((directory) =>
    relativePath === directory || relativePath.startsWith(`${directory}/`)
  );
}

async function listMarkdownFiles(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareCodeUnits(left.name, right.name))) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdownFiles(entryPath, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) files.push(entryPath);
  }
  return files;
}

function collectPathCandidates(value, candidates) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectPathCandidates(entry, candidates);
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === 'string' && /(?:^|_)(?:file|path)(?:_|$)/i.test(key)) {
      candidates.add(nestedValue);
    } else {
      collectPathCandidates(nestedValue, candidates);
    }
  }
}

function collectPatchPathCandidates(rawPayload, candidates) {
  for (const match of rawPayload.matchAll(/^\*\*\* (?:Update|Delete) File: (.+)$/gm)) candidates.add(match[1].trim());
  for (const match of rawPayload.matchAll(/^\*\*\* Add File: (.+)$/gm)) candidates.add(match[1].trim());
}

function collectPatchPayloadCandidates(value, candidates) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectPatchPayloadCandidates(entry, candidates);
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === 'string' && /patch/i.test(key)) {
      collectPatchPathCandidates(nestedValue, candidates);
    } else {
      collectPatchPayloadCandidates(nestedValue, candidates);
    }
  }
}

function normalizeCandidatePath(candidate) {
  const withoutPrefix = candidate.replace(/^[ab]\//, '');
  return withoutPrefix.startsWith('/') ? withoutPrefix : withoutPrefix.replaceAll('\\', '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deny(message, details) {
  console.error(message);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}
