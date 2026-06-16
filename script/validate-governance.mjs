import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  AGENT_SPECIFICATIONS,
  GOVERNANCE_MARKDOWN_DIRECTORIES,
  REQUIRED_FILES
} from './governance/spec.mjs';
import {
  compareCodeUnits,
  validateAgentEntries,
  validateAdrDocument,
  validateAgentDocument,
  validateCodexConfig,
  validateContextBudgetSkill,
  validateDecisionMemory,
  validateGenerateCommitSkill,
  validateAgenticWorkflowGuide,
  validateOrchestrateRequestSkill,
  validateQualityGateSkill,
  validateWorkflowScriptPaths
} from './governance/validators.mjs';

const markdownLinkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

async function listFiles(directory, predicate = () => true) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareCodeUnits(left.name, right.name))) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath, predicate));
    else if (entry.isFile() && predicate(entryPath)) files.push(entryPath);
  }
  return files;
}

export async function validateInternalLinks(rootDirectory, files) {
  const errors = [];
  for (const filePath of [...files].sort(compareCodeUnits)) {
    const contents = await fs.readFile(filePath, 'utf8');
    for (const match of contents.matchAll(markdownLinkPattern)) {
      const target = match[1].trim().replace(/^<|>$/g, '');
      if (!target || target.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
      const targetPath = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (!targetPath) continue;
      const resolvedPath = targetPath.startsWith('/')
        ? path.join(rootDirectory, targetPath)
        : path.resolve(path.dirname(filePath), targetPath);
      try {
        await fs.access(resolvedPath);
      } catch {
        errors.push(`${path.relative(rootDirectory, filePath)}: broken link ${target}`);
      }
    }
  }
  return errors;
}

async function validateReportPolicy(rootDirectory) {
  try {
    const contents = await fs.readFile(path.join(rootDirectory, '.gitignore'), 'utf8');
    const lines = contents.split('\n');
    const errors = [];
    if (!lines.includes('reports/*')) errors.push('.gitignore: missing reports/*');
    if (!lines.includes('!reports/README.md')) errors.push('.gitignore: missing !reports/README.md');
    return errors;
  } catch {
    return ['.gitignore: required for reports retention policy'];
  }
}

async function readPair(root, first, second, validator) {
  try {
    const [firstContents, secondContents] = await Promise.all([
      fs.readFile(path.join(root, first), 'utf8'),
      fs.readFile(path.join(root, second), 'utf8')
    ]);
    return validator(firstContents, secondContents);
  } catch {
    return [`${first} + ${second}: required skill files are unreadable`];
  }
}

export async function validateGovernance(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];

  for (const relativePath of REQUIRED_FILES) {
    try {
      await fs.access(path.join(root, relativePath));
    } catch {
      errors.push(`${relativePath}: required file is missing`);
    }
  }

  try {
    const agentsGuide = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8');
    errors.push(...validateAgenticWorkflowGuide(agentsGuide));
  } catch {
    // Required-file diagnostics cover this path.
  }

  try {
    const adrDirectory = path.join(root, 'doc', 'adr');
    const adrFiles = (await fs.readdir(adrDirectory))
      .filter((fileName) => fileName !== 'README.md' && fileName.endsWith('.md'))
      .sort(compareCodeUnits);
    if (adrFiles.length === 0) errors.push('doc/adr: at least one ADR is required');
    for (const fileName of adrFiles) {
      errors.push(...validateAdrDocument(fileName, await fs.readFile(path.join(adrDirectory, fileName), 'utf8')));
    }
  } catch {
    errors.push('doc/adr: directory is missing or unreadable');
  }

  try {
    errors.push(...validateDecisionMemory(await fs.readFile(path.join(root, 'memory', 'decisions.md'), 'utf8')));
  } catch {
    // Required-file diagnostics cover this path.
  }

  errors.push(...await readPair(
    root,
    '.agents/skills/context-budget-monitor/SKILL.md',
    '.agents/skills/context-budget-monitor/agents/openai.yaml',
    validateContextBudgetSkill
  ));
  errors.push(...await readPair(
    root,
    '.agents/skills/generate-commit/SKILL.md',
    '.agents/skills/generate-commit/agents/openai.yaml',
    validateGenerateCommitSkill
  ));
  errors.push(...await readPair(
    root,
    '.agents/skills/orchestrate-request/SKILL.md',
    '.agents/skills/orchestrate-request/agents/openai.yaml',
    validateOrchestrateRequestSkill
  ));
  errors.push(...await readPair(
    root,
    '.agents/skills/quality-gate/SKILL.md',
    '.agents/skills/quality-gate/agents/openai.yaml',
    validateQualityGateSkill
  ));

  try {
    errors.push(...validateCodexConfig(await fs.readFile(path.join(root, '.codex', 'config.toml'), 'utf8')));
  } catch {
    // Required-file diagnostics cover this path.
  }

  for (const agentName of Object.keys(AGENT_SPECIFICATIONS).sort(compareCodeUnits)) {
    const fileName = `${agentName}.toml`;
    try {
      errors.push(...validateAgentDocument(fileName, await fs.readFile(path.join(root, '.codex', 'agents', fileName), 'utf8')));
    } catch {
      // Required-file diagnostics cover this path.
    }
  }

  try {
    errors.push(...validateAgentEntries(await fs.readdir(path.join(root, '.codex', 'agents'))));
  } catch {
    // Required-file diagnostics cover the expected definitions.
  }

  try {
    await fs.access(path.join(root, 'skills'));
    errors.push('skills/: repository skills must live under .agents/skills/');
  } catch {
    // The forbidden root-level skills directory is absent.
  }

  const markdownFiles = [path.join(root, 'AGENTS.md')];
  for (const directory of GOVERNANCE_MARKDOWN_DIRECTORIES) {
    try {
      markdownFiles.push(...await listFiles(path.join(root, directory), (filePath) => filePath.endsWith('.md')));
    } catch {
      // Required paths are reported separately.
    }
  }
  errors.push(...await validateInternalLinks(root, markdownFiles));

  try {
    const scriptFiles = await listFiles(path.join(root, 'script'));
    errors.push(...validateWorkflowScriptPaths(scriptFiles.map((filePath) => path.relative(root, filePath))));
  } catch {
    errors.push('script: directory is missing or unreadable');
  }

  errors.push(...await validateReportPolicy(root));
  return errors.sort(compareCodeUnits);
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = await validateGovernance(rootDirectory);
  if (errors.length > 0) {
    console.error('Governance validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Governance validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();

export {
  compareCodeUnits,
  validateAdrDocument,
  validateAgentDocument,
  validateAgentEntries,
  validateCodexConfig,
  validateContextBudgetSkill,
  validateDecisionMemory,
  validateGenerateCommitSkill,
  validateAgenticWorkflowGuide,
  validateOrchestrateRequestSkill,
  validateQualityGateSkill,
  validateWorkflowScriptPaths
} from './governance/validators.mjs';
