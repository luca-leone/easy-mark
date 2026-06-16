import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AGENT_SPECIFICATIONS } from './governance/spec.mjs';
import {
  compareCodeUnits,
  validateAgentDocument,
  validateAgenticWorkflowGuide,
  validateAgenticWorkflowPolicy,
  validateOrchestrateRequestSkill,
  validateQualityGateSkill,
  validateResourceBudgetGateSkill,
  validateResourceBudgetPolicy
} from './governance/validators.mjs';
import { validateAgenticPaths } from './validate-agentic-paths.mjs';

async function readPair(root, first, second, validator) {
  try {
    const [firstContents, secondContents] = await Promise.all([
      fs.readFile(path.join(root, first), 'utf8'),
      fs.readFile(path.join(root, second), 'utf8')
    ]);
    return validator(firstContents, secondContents);
  } catch {
    return [`${first} + ${second}: required agentic workflow files are unreadable`];
  }
}

export async function validateAgenticWorkflow(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];

  try {
    errors.push(...validateAgenticWorkflowGuide(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')));
  } catch {
    errors.push('AGENTS.md: required for deterministic agentic workflow validation');
  }

  try {
    errors.push(...validateAgenticWorkflowPolicy(
      await fs.readFile(path.join(root, 'rules', 'agentic-workflow.md'), 'utf8')
    ));
  } catch {
    errors.push('rules/agentic-workflow.md: required for deterministic agentic workflow validation');
  }

  try {
    errors.push(...validateResourceBudgetPolicy(
      await fs.readFile(path.join(root, 'rules', 'resource-budgets.md'), 'utf8')
    ));
  } catch {
    errors.push('rules/resource-budgets.md: required for deterministic agentic workflow validation');
  }

  errors.push(...await validateAgenticPaths(root));

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
  errors.push(...await readPair(
    root,
    '.agents/skills/resource-budget-gate/SKILL.md',
    '.agents/skills/resource-budget-gate/agents/openai.yaml',
    validateResourceBudgetGateSkill
  ));

  for (const agentName of Object.keys(AGENT_SPECIFICATIONS).sort(compareCodeUnits)) {
    const fileName = `${agentName}.toml`;
    try {
      const contents = await fs.readFile(path.join(root, '.codex', 'agents', fileName), 'utf8');
      errors.push(...validateAgentDocument(fileName, contents));
    } catch {
      errors.push(`.codex/agents/${fileName}: required for deterministic agentic workflow validation`);
    }
  }

  return errors.sort(compareCodeUnits);
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = await validateAgenticWorkflow(rootDirectory);
  if (errors.length > 0) {
    console.error('Agentic workflow validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Agentic workflow validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
