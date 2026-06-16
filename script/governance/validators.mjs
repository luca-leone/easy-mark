import path from 'node:path';
import { AGENT_SPECIFICATIONS, EXPECTED_AGENT_FILES, REQUIRED_ADR_SECTIONS } from './spec.mjs';

const decisionPattern = /^- (\d{4}-\d{2}-\d{2}) \| (Accepted|Proposed|Deprecated|Superseded|Rejected) \| .+ \| (.+)$/;

export function validateAdrDocument(fileName, contents) {
  const errors = [];
  if (!/^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(fileName)) {
    errors.push(`${fileName}: ADR filename must match NNNN-kebab-case-title.md`);
  }

  const number = fileName.slice(0, 4);
  if (!contents.startsWith(`# ADR-${number}: `)) {
    errors.push(`${fileName}: title must start with "# ADR-${number}: "`);
  }

  for (const section of REQUIRED_ADR_SECTIONS) {
    if (!contents.includes(`\n${section}\n`)) errors.push(`${fileName}: missing section ${section}`);
  }

  return errors;
}

export function validateDecisionMemory(contents) {
  const errors = [];
  const entries = contents.split('\n').filter((line) => /^- \d{4}-\d{2}-\d{2} \|/.test(line));

  if (entries.length === 0) errors.push('memory/decisions.md: no decision entries found');

  for (const entry of entries) {
    const match = entry.match(decisionPattern);
    if (!match) {
      errors.push(`memory/decisions.md: invalid entry: ${entry}`);
      continue;
    }

    const date = new Date(`${match[1]}T00:00:00Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== match[1]) {
      errors.push(`memory/decisions.md: invalid ISO date: ${match[1]}`);
    }

    if (match[3] !== 'N/A' && !/\[ADR-\d{4}\]\([^)]*\/\d{4}-[^)]+\.md\)/.test(match[3])) {
      errors.push(`memory/decisions.md: invalid ADR reference: ${match[3]}`);
    }
  }

  return errors;
}

export function validateContextBudgetSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['context-budget-monitor: missing YAML frontmatter'];
  if (!/^name: context-budget-monitor$/m.test(frontmatter[1])) errors.push('context-budget-monitor: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('context-budget-monitor: missing description');
  for (const threshold of ['50%', '30%', '15%']) {
    if (!skillContents.includes(threshold)) errors.push(`context-budget-monitor: missing ${threshold} threshold`);
  }
  if (!skillContents.includes('/status')) errors.push('context-budget-monitor: missing /status authority');
  if (!skillContents.includes('/compact')) errors.push('context-budget-monitor: missing /compact handoff');
  if (!skillContents.includes('Never invent')) errors.push('context-budget-monitor: missing no-estimation rule');
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('context-budget-monitor: implicit invocation must be disabled');
  }
  return errors;
}

export function validateGenerateCommitSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['generate-commit: missing YAML frontmatter'];
  if (!/^name: generate-commit$/m.test(frontmatter[1])) errors.push('generate-commit: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('generate-commit: missing description');
  if (!skillContents.includes('git diff --cached')) errors.push('generate-commit: must inspect the staged diff');
  if (!skillContents.includes('explicit')) errors.push('generate-commit: must require explicit approval');
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('generate-commit: implicit invocation must be disabled');
  }
  return errors;
}

export function validateAutoCommitSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['auto-commit: missing YAML frontmatter'];
  if (!/^name: auto-commit$/m.test(frontmatter[1])) errors.push('auto-commit: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('auto-commit: missing description');
  for (const phrase of [
    'npm run task:commit',
    'git add --all',
    'Version And Tag Proposal',
    'git push origin <tag>',
    'Push remains manual'
  ]) {
    if (!skillContents.includes(phrase)) errors.push(`auto-commit: missing ${phrase}`);
  }
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('auto-commit: implicit invocation must be disabled');
  }
  return errors;
}

export function validateAgenticWorkflowGuide(contents) {
  const errors = [];
  const requiredPhrases = [
    'Deterministic Agentic Workflow',
    'rules/agentic-workflow.md',
    'rules/resource-budgets.md',
    '$orchestrate-request',
    '$quality-gate',
    '$resource-budget-gate',
    'ADR-0033'
  ];
  for (const phrase of requiredPhrases) {
    if (!contents.includes(phrase)) errors.push(`AGENTS.md: missing deterministic workflow phrase ${phrase}`);
  }
  for (const misplacedHeading of [
    '## Implementation Constraints',
    '## Repository Map',
    '## Commands',
    '## Scoped Policies',
    '### Requirements Discovery And Reconciliation Loop',
    '### Routing Loop',
    '### Quality, Contract, And Guardrail Loop',
    '### Repair Loop',
    '### Handoff Loop'
  ]) {
    if (contents.includes(misplacedHeading)) {
      errors.push(`AGENTS.md: detailed policy belongs in rules/agentic-workflow.md, not ${misplacedHeading}`);
    }
  }
  return errors;
}

export function validateAgenticWorkflowPolicy(contents) {
  const errors = [];
  const requiredPhrases = [
    'Deterministic Agentic Workflow',
    'intake',
    'classification',
    'requirements-discovery',
    'requirements-reconciliation',
    'budget-gate',
    'routing',
    'planning',
    'execution',
    'quality-review',
    'contract-guardrail-check',
    'verification',
    'repair-loop',
    'handoff',
    'Requirements Discovery And Reconciliation Loop',
    'Budget Gate And Runtime Budget Loop',
    'Routing Loop',
    'Quality, Contract, And Guardrail Loop',
    'Repair Loop',
    'Handoff Loop',
    'Execution Template',
    '$orchestrate-request',
    '$quality-gate',
    '$resource-budget-gate',
    'Budget Envelope',
    'ADR-0033'
  ];
  for (const phrase of requiredPhrases) {
    if (!contents.includes(phrase)) {
      errors.push(`rules/agentic-workflow.md: missing deterministic workflow phrase ${phrase}`);
    }
  }
  return errors;
}

export function validateResourceBudgetPolicy(contents) {
  const errors = [];
  const requiredPhrases = [
    'Resource Budgets',
    'Budget Envelope',
    'Task Class',
    'Context Budget',
    'Max Concurrent Runs',
    'Max Write Agents',
    'Max Read Agents',
    'Execution Budget',
    'Provider Budget',
    'Runtime Budget Loop',
    'Budget Repair Loop',
    'Handoff Report',
    '50%',
    '30%',
    '15%',
    'max_threads = 4',
    'max_depth = 1',
    'Do not claim monetary cost',
    'three consecutive attempts',
    'ADR-0035'
  ];
  for (const phrase of requiredPhrases) {
    if (!contents.includes(phrase)) {
      errors.push(`rules/resource-budgets.md: missing deterministic budget phrase ${phrase}`);
    }
  }
  return errors;
}

export function validateDocumentationScope(agentGuideContents) {
  const errors = [];
  if (agentGuideContents.split('\n').length > 150) {
    errors.push('AGENTS.md: keep the agent bootstrap guide at or below 150 lines');
  }
  for (const phrase of [
    '## Implementation Constraints',
    '## Repository Map',
    '## Commands',
    '## Scoped Policies',
    'Loop Da Introdurre',
    'Piano D’Attuazione Completo',
    'Piano D\\u2019Attuazione Completo',
    'Ordine Di Implementazione Consigliato'
  ]) {
    if (agentGuideContents.includes(phrase)) {
      errors.push(`AGENTS.md: out-of-scope content remains: ${phrase}`);
    }
  }
  return errors;
}

export function validateOrchestrateRequestSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['orchestrate-request: missing YAML frontmatter'];
  if (!/^name: orchestrate-request$/m.test(frontmatter[1])) errors.push('orchestrate-request: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('orchestrate-request: missing description');
  for (const phrase of [
    'State Machine',
    'requirements-discovery',
    'requirements-reconciliation',
    'budget-gate',
    '$resource-budget-gate',
    'Budget Envelope',
    'Acceptance Criteria',
    'Verification Matrix',
    'Repair Triggers',
    'planner',
    'senior-implementer'
  ]) {
    if (!skillContents.includes(phrase)) errors.push(`orchestrate-request: missing ${phrase}`);
  }
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('orchestrate-request: implicit invocation must be disabled');
  }
  return errors;
}

export function validateResourceBudgetGateSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['resource-budget-gate: missing YAML frontmatter'];
  if (!/^name: resource-budget-gate$/m.test(frontmatter[1])) errors.push('resource-budget-gate: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('resource-budget-gate: missing description');
  for (const phrase of [
    'Budget Envelope',
    'Max Concurrent Runs',
    'Max Write Agents',
    'Max Read Agents',
    'Execution Budget',
    'Provider Budget',
    'Runtime Budget Loop',
    'Repair Triggers',
    '50%',
    '30%',
    '15%',
    'max_threads = 4',
    'max_depth = 1',
    'Do not claim monetary cost',
    'three consecutive attempts'
  ]) {
    if (!skillContents.includes(phrase)) errors.push(`resource-budget-gate: missing ${phrase}`);
  }
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('resource-budget-gate: implicit invocation must be disabled');
  }
  return errors;
}

export function validateQualityGateSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['quality-gate: missing YAML frontmatter'];
  if (!/^name: quality-gate$/m.test(frontmatter[1])) errors.push('quality-gate: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('quality-gate: missing description');
  for (const phrase of [
    'Review Loop',
    'Contract And Guardrail Check',
    'Repair Loop',
    'Handoff Gate',
    'npm test',
    'memory/decisions.md',
    'contracts/application-contract.md'
  ]) {
    if (!skillContents.includes(phrase)) errors.push(`quality-gate: missing ${phrase}`);
  }
  if (!/allow_implicit_invocation:\s*false/.test(metadataContents)) {
    errors.push('quality-gate: implicit invocation must be disabled');
  }
  return errors;
}

export function validateCodexConfig(contents) {
  const errors = [];
  if (!/^\[agents\]$/m.test(contents)) errors.push('.codex/config.toml: missing [agents] section');
  if (!/^max_threads\s*=\s*4$/m.test(contents)) errors.push('.codex/config.toml: agents.max_threads must be 4');
  if (!/^max_depth\s*=\s*1$/m.test(contents)) errors.push('.codex/config.toml: agents.max_depth must be 1');
  if (!/^\[tui\]$/m.test(contents)) errors.push('.codex/config.toml: missing [tui] section');
  if (!/status_line\s*=\s*\[[^\]]*"context-remaining"[^\]]*\]/s.test(contents)) {
    errors.push('.codex/config.toml: status_line must include context-remaining');
  }
  return errors;
}

export function validateAgentDocument(fileName, contents) {
  const errors = [];
  const agentName = fileName.replace(/\.toml$/, '');
  const expected = AGENT_SPECIFICATIONS[agentName];

  if (!expected) return [`.codex/agents/${fileName}: unexpected agent definition`];
  if (!new RegExp(`^name\\s*=\\s*"${agentName}"$`, 'm').test(contents)) {
    errors.push(`.codex/agents/${fileName}: name must match filename`);
  }
  if (!/^description\s*=\s*".+"$/m.test(contents)) errors.push(`.codex/agents/${fileName}: missing description`);
  if (!/^developer_instructions\s*=\s*"""[\s\S]+"""$/m.test(contents)) {
    errors.push(`.codex/agents/${fileName}: missing developer_instructions`);
  }
  if (!new RegExp(`^model\\s*=\\s*"${expected.model.replace('.', '\\.')}"$`, 'm').test(contents)) {
    errors.push(`.codex/agents/${fileName}: model must be ${expected.model}`);
  }
  if (!new RegExp(`^model_reasoning_effort\\s*=\\s*"${expected.effort}"$`, 'm').test(contents)) {
    errors.push(`.codex/agents/${fileName}: model_reasoning_effort must be ${expected.effort}`);
  }
  if (!new RegExp(`^sandbox_mode\\s*=\\s*"${expected.sandbox}"$`, 'm').test(contents)) {
    errors.push(`.codex/agents/${fileName}: sandbox_mode must be ${expected.sandbox}`);
  }
  if (!contents.includes('ADR-0033')) {
    errors.push(`.codex/agents/${fileName}: must reference ADR-0033 deterministic workflow`);
  }
  if (!contents.includes('ADR-0035') || !contents.includes('Budget Envelope')) {
    errors.push(`.codex/agents/${fileName}: must reference ADR-0035 Budget Envelope policy`);
  }
  return errors;
}

export function validateWorkflowScriptPaths(relativePaths) {
  return relativePaths
    .filter((relativePath) => path.extname(relativePath).toLowerCase() !== '.mjs')
    .sort(compareCodeUnits)
    .map((relativePath) => `${relativePath}: workflow and maintenance scripts must use ESM .mjs`);
}

export function validateAgentEntries(entries) {
  return [...entries]
    .filter((entry) => !EXPECTED_AGENT_FILES.includes(entry))
    .sort(compareCodeUnits)
    .map((entry) => `.codex/agents/${entry}: unexpected agent entry`);
}

export function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
