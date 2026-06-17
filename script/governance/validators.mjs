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
    'remote tags',
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
    'contracts/governance/agentic-workflow-events.json',
    'rules/markdown-governance.md',
    'contracts/governance/markdown-governance.json',
    'contracts/governance/versioning.json',
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
    'agentic-paths.json',
    'agentic-workflow-events.json',
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'repair mode',
    'workflow:status',
    'agentic compliance report',
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

export function validateAgenticPathContract(contract) {
  const errors = [];
  const requiredPathOrder = [
    'trivial-read-only',
    'trivial-command',
    'low-change',
    'medium-change',
    'high-change',
    'release'
  ];
  const requiredStates = [
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
    'handoff'
  ];
  const runtimeFields = [
    'Selected Path',
    'Task Facts',
    'Escalation Rules Applied',
    'Required States',
    'Required Fields',
    'Budget Envelope',
    'Verification'
  ];
  const escalationIds = [
    'touches-agentic-workflow-governance',
    'changes-observable-product-behavior',
    'changes-contract-or-adr',
    'uses-project-agents',
    'no-matching-path'
  ];
  const complianceFields = [
    'Selected Path',
    'Escalation Rules Applied',
    'Required States',
    'Required Fields',
    'Budget Envelope',
    'Verification',
    'Hook Monitoring',
    'Hook Violation Policy',
    'Violations'
  ];

  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['contracts/governance/agentic-paths.json: contract must be a JSON object'];
  }
  if (contract.version !== 1) errors.push('contracts/governance/agentic-paths.json: version must be 1');
  if (JSON.stringify(contract.pathOrder) !== JSON.stringify(requiredPathOrder)) {
    errors.push('contracts/governance/agentic-paths.json: pathOrder must define the deterministic path order');
  }
  if (!Array.isArray(contract.selectionRule?.algorithm) || contract.selectionRule.algorithm.length < 5) {
    errors.push('contracts/governance/agentic-paths.json: selectionRule.algorithm must define deterministic selection');
  }
  for (const phrase of ['Apply every escalation rule', 'When no path matches, select high-change']) {
    if (!contract.selectionRule?.algorithm?.some((step) => step.includes(phrase))) {
      errors.push(`contracts/governance/agentic-paths.json: selectionRule.algorithm missing ${phrase}`);
    }
  }

  const requiredBefore = contract.runtimeContract?.requiredBefore;
  if (!Array.isArray(requiredBefore)) {
    errors.push('contracts/governance/agentic-paths.json: runtimeContract.requiredBefore is required');
  } else {
    for (const action of ['file-edits', 'non-trivial-commands', 'project-agent-runs']) {
      if (!requiredBefore.includes(action)) {
        errors.push(`contracts/governance/agentic-paths.json: runtimeContract.requiredBefore missing ${action}`);
      }
    }
  }
  const requiredRuntimeFields = contract.runtimeContract?.requiredFields;
  if (!Array.isArray(requiredRuntimeFields)) {
    errors.push('contracts/governance/agentic-paths.json: runtimeContract.requiredFields is required');
  } else {
    for (const field of runtimeFields) {
      if (!requiredRuntimeFields.includes(field)) {
        errors.push(`contracts/governance/agentic-paths.json: runtimeContract.requiredFields missing ${field}`);
      }
    }
  }

  const paths = contract.paths && typeof contract.paths === 'object' && !Array.isArray(contract.paths)
    ? contract.paths
    : {};
  if (Object.keys(paths).length === 0) errors.push('contracts/governance/agentic-paths.json: paths object is required');
  requiredPathOrder.forEach((pathId, expectedRank) => {
    const pathDefinition = paths[pathId];
    if (!pathDefinition || typeof pathDefinition !== 'object' || Array.isArray(pathDefinition)) {
      errors.push(`contracts/governance/agentic-paths.json: missing path ${pathId}`);
      return;
    }
    if (pathDefinition.rank !== expectedRank) {
      errors.push(`contracts/governance/agentic-paths.json: ${pathId} rank must be ${expectedRank}`);
    }
    for (const field of ['conditions', 'requiredStates', 'requiredFields', 'verification', 'forbiddenActions']) {
      if (!Array.isArray(pathDefinition[field]) || pathDefinition[field].length === 0) {
        errors.push(`contracts/governance/agentic-paths.json: ${pathId}.${field} must be a non-empty array`);
      }
    }
  });

  const highChange = paths['high-change'];
  if (highChange) {
    for (const state of requiredStates) {
      if (!highChange.requiredStates?.includes(state)) {
        errors.push(`contracts/governance/agentic-paths.json: high-change.requiredStates missing ${state}`);
      }
    }
    for (const field of ['Source Documents', 'Budget Envelope', 'Verification Matrix', 'Handoff Gate']) {
      if (!highChange.requiredFields?.includes(field)) {
        errors.push(`contracts/governance/agentic-paths.json: high-change.requiredFields missing ${field}`);
      }
    }
  }

  if (!Array.isArray(contract.escalationRules)) {
    errors.push('contracts/governance/agentic-paths.json: escalationRules must be an array');
  } else {
    for (const escalationId of escalationIds) {
      if (!contract.escalationRules.some((rule) => rule.id === escalationId)) {
        errors.push(`contracts/governance/agentic-paths.json: escalationRules missing ${escalationId}`);
      }
    }
    for (const rule of contract.escalationRules) {
      if (!requiredPathOrder.includes(rule.minimumPath)) {
        errors.push(`contracts/governance/agentic-paths.json: ${rule.id ?? 'escalation rule'} minimumPath is invalid`);
      }
    }
  }

  const requiredComplianceFields = contract.complianceReport?.requiredFields;
  if (!Array.isArray(requiredComplianceFields)) {
    errors.push('contracts/governance/agentic-paths.json: complianceReport.requiredFields is required');
  } else {
    for (const field of complianceFields) {
      if (!requiredComplianceFields.includes(field)) {
        errors.push(`contracts/governance/agentic-paths.json: complianceReport.requiredFields missing ${field}`);
      }
    }
  }

  if (!contract.hookPolicy?.semantics?.includes('not a guaranteed hard stop')) {
    errors.push('contracts/governance/agentic-paths.json: hookPolicy.semantics must avoid hard-stop assumptions');
  }
  if (!contract.hookPolicy?.violationPolicy?.includes('repair mode')) {
    errors.push('contracts/governance/agentic-paths.json: hookPolicy.violationPolicy must require repair mode');
  }

  return errors;
}

export function validateAgenticHookConfig(hookConfig) {
  const errors = [];
  if (!hookConfig || typeof hookConfig !== 'object' || Array.isArray(hookConfig)) {
    return ['.codex/hooks.json: hook config must be a JSON object'];
  }

  for (const eventName of ['PreToolUse', 'PostToolUse']) {
    const hookEntries = hookConfig.hooks?.[eventName];
    if (!Array.isArray(hookEntries)) {
      errors.push(`.codex/hooks.json: hooks.${eventName} must be an array`);
      continue;
    }
    const scriptName = eventName === 'PreToolUse'
      ? 'pre-tool-use-agentic-lean-path.mjs'
      : 'post-tool-use-agentic-lean-path.mjs';
    for (const matcher of ['^Bash$', '^(apply_patch|Edit|Write)$']) {
      const entry = hookEntries.find((hookEntry) => hookEntry.matcher === matcher);
      if (!entry) {
        errors.push(`.codex/hooks.json: missing ${eventName} matcher ${matcher}`);
        continue;
      }
      const commandHook = entry.hooks?.find((hook) =>
        hook.type === 'command' &&
        typeof hook.command === 'string' &&
        hook.command.includes(`.codex/hooks/${scriptName}`)
      );
      if (!commandHook) {
        errors.push(`.codex/hooks.json: matcher ${matcher} must run ${scriptName}`);
        continue;
      }
      if (commandHook.timeout !== 30) errors.push(`.codex/hooks.json: matcher ${matcher} timeout must be 30`);
      if (!commandHook.statusMessage?.includes('agentic lean path')) {
        errors.push(`.codex/hooks.json: matcher ${matcher} must describe agentic lean path monitoring`);
      }
    }
  }

  return errors;
}

export function validateAgenticWorkflowHookConfig(hookConfig) {
  const errors = [];
  if (!hookConfig || typeof hookConfig !== 'object' || Array.isArray(hookConfig)) {
    return ['.codex/hooks.json: hook config must be a JSON object'];
  }

  for (const matcher of ['^Bash$', '^(apply_patch|Edit|Write)$']) {
    const entry = hookConfig.hooks?.PreToolUse?.find((hookEntry) => hookEntry.matcher === matcher);
    if (!entry?.hooks?.some((hook) =>
      hook.type === 'command' &&
      hook.command?.includes('.codex/hooks/pre-tool-use-agentic-workflow.mjs') &&
      hook.statusMessage?.includes('agentic workflow')
    )) {
      errors.push(`.codex/hooks.json: ${matcher} must run pre-tool-use-agentic-workflow.mjs`);
    }
  }

  for (const [eventName, scriptName] of [
    ['UserPromptSubmit', 'user-prompt-submit-agentic-workflow.mjs'],
    ['SubagentStart', 'subagent-start-agentic-workflow.mjs'],
    ['SubagentStop', 'subagent-stop-agentic-workflow.mjs'],
    ['Stop', 'stop-agentic-workflow.mjs']
  ]) {
    const hookEntries = hookConfig.hooks?.[eventName];
    if (!Array.isArray(hookEntries)) {
      errors.push(`.codex/hooks.json: hooks.${eventName} must be an array`);
      continue;
    }
    if (!hookEntries.some((entry) => entry.hooks?.some((hook) =>
      hook.type === 'command' &&
      hook.command?.includes(`.codex/hooks/${scriptName}`) &&
      hook.timeout === 30 &&
      hook.statusMessage?.includes('agentic workflow')
    ))) {
      errors.push(`.codex/hooks.json: hooks.${eventName} must run ${scriptName}`);
    }
  }

  return errors;
}

export function validateMarkdownGovernanceHookConfig(hookConfig) {
  const errors = [];
  if (!hookConfig || typeof hookConfig !== 'object' || Array.isArray(hookConfig)) {
    return ['.codex/hooks.json: hook config must be a JSON object'];
  }

  for (const eventName of ['PreToolUse', 'PostToolUse']) {
    const hookEntries = hookConfig.hooks?.[eventName];
    if (!Array.isArray(hookEntries)) {
      errors.push(`.codex/hooks.json: hooks.${eventName} must be an array`);
      continue;
    }
    const scriptName = eventName === 'PreToolUse'
      ? 'pre-tool-use-markdown-governance.mjs'
      : 'post-tool-use-markdown-governance.mjs';
    const entry = hookEntries.find((hookEntry) => hookEntry.matcher === '^(apply_patch|Edit|Write)$');
    if (!entry) {
      errors.push(`.codex/hooks.json: missing ${eventName} matcher ^(apply_patch|Edit|Write)$`);
      continue;
    }
    const commandHook = entry.hooks?.find((hook) =>
      hook.type === 'command' &&
      typeof hook.command === 'string' &&
      hook.command.includes(`.codex/hooks/${scriptName}`)
    );
    if (!commandHook) {
      errors.push(`.codex/hooks.json: edit matcher must run ${scriptName}`);
      continue;
    }
    if (commandHook.timeout !== 30) errors.push(`.codex/hooks.json: ${scriptName} timeout must be 30`);
    if (!commandHook.statusMessage?.includes('markdown governance')) {
      errors.push(`.codex/hooks.json: ${scriptName} must describe markdown governance monitoring`);
    }
  }

  return errors;
}

export function validateAgenticHookScript(contents) {
  const errors = [];
  for (const phrase of [
    'Agentic lean path',
    'DEFAULT_RUNTIME_CONTRACT_PATH',
    'toolCallRequiresRuntimeContract',
    'validateAgenticRuntimeContract',
    'agentic-paths.json',
    'repair mode',
    'process.exit(1)'
  ]) {
    if (!contents.includes(phrase)) errors.push(`agentic-lean-path hook script: missing ${phrase}`);
  }
  return errors;
}

export function validateAgenticWorkflowHookScript(contents) {
  const errors = [];
  for (const phrase of [
    'Agentic workflow',
    'runWorkflowHook',
    'repair mode'
  ]) {
    if (!contents.includes(phrase)) errors.push(`agentic-workflow hook script: missing ${phrase}`);
  }
  return errors;
}

export function validateMarkdownGovernancePolicy(contents) {
  const errors = [];
  for (const phrase of [
    'Markdown Governance',
    'contracts/governance/markdown-governance.json',
    'Governed Markdown',
    'markdown.banned-modals',
    'must',
    'PreToolUse',
    'PostToolUse',
    'repair mode',
    'script/repair-markdown-governance.mjs'
  ]) {
    if (!contents.includes(phrase)) errors.push(`rules/markdown-governance.md: missing ${phrase}`);
  }
  return errors;
}

export function validateReleaseProcessPolicy(contents) {
  const errors = [];
  for (const phrase of [
    'npm run validate:versioning',
    'npm run pack:dry-run',
    'package.json',
    'local tags',
    'remote tags',
    'git push origin <tag>'
  ]) {
    if (!contents.includes(phrase)) errors.push(`rules/release-process.md: missing ${phrase}`);
  }
  return errors;
}

export function validateMarkdownGovernanceHookScript(contents) {
  const errors = [];
  for (const phrase of [
    'Markdown governance',
    'JSON Markdown contract',
    'runMarkdownGovernanceHook',
    'repair mode'
  ]) {
    if (!contents.includes(phrase)) errors.push(`markdown-governance hook script: missing ${phrase}`);
  }
  return errors;
}

export function validateDocumentationScope(agentGuideContents) {
  const errors = [];
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

export function validateMarkdownLineBudgets(entries, limit = 150) {
  return entries
    .filter(({ contents }) => contents.split('\n').length > limit)
    .map(({ relativePath, contents }) =>
      `${relativePath}: Markdown files must stay at or below ${limit} lines; found ${contents.split('\n').length}`
    )
    .sort(compareCodeUnits);
}

export function validateOrchestrateRequestSkill(skillContents, metadataContents) {
  const errors = [];
  const frontmatter = skillContents.match(/^---\n([\s\S]*?)\n---\n/);

  if (!frontmatter) return ['orchestrate-request: missing YAML frontmatter'];
  if (!/^name: orchestrate-request$/m.test(frontmatter[1])) errors.push('orchestrate-request: invalid or missing name');
  if (!/^description: .+/m.test(frontmatter[1])) errors.push('orchestrate-request: missing description');
  for (const phrase of [
    'State Machine',
    'agentic-paths.json',
    'PreToolUse',
    'PostToolUse',
    'repair mode',
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
    'agentic compliance report',
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
