import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_RUNTIME_CONTRACT_PATH = path.join('reports', 'agentic-runtime-contract.json');

const runtimeFieldMap = Object.freeze({
  'Selected Path': 'selectedPath',
  'Task Facts': 'taskFacts',
  'Escalation Rules Applied': 'escalationRulesApplied',
  'Required States': 'requiredStates',
  'Required Fields': 'requiredFields',
  'Budget Envelope': 'budgetEnvelope',
  Verification: 'verification'
});

const readOnlyCommandPatterns = Object.freeze([
  /^pwd(?:\s|$)/,
  /^ls(?:\s|$)/,
  /^find\s+[^;&|<>]*$/,
  /^rg(?:\s|$)/,
  /^sed\s+-n(?:\s|$)/,
  /^nl\s+-ba(?:\s|$)/,
  /^cat\s+[^;&|<>]*$/,
  /^wc\s+(?:-l\s+)?[^;&|<>]+$/,
  /^git\s+status(?:\s|$)/,
  /^git\s+diff(?:\s|$)/,
  /^git\s+log(?:\s|$)/,
  /^git\s+show(?:\s|$)/,
  /^git\s+tag\s+--points-at(?:\s|$)/
]);

export async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export function parseHookPayload(rawPayload) {
  if (!rawPayload.trim()) return {};
  try {
    return JSON.parse(rawPayload);
  } catch {
    return { rawPayload };
  }
}

export function getToolName(payload) {
  return firstString(
    payload.toolName,
    payload.tool_name,
    payload.tool,
    payload.name,
    payload.event?.toolName,
    payload.event?.tool_name,
    payload.toolCall?.name,
    payload.tool_call?.name
  );
}

export function getCommand(payload) {
  return firstString(
    payload.command,
    payload.cmd,
    payload.input?.command,
    payload.input?.cmd,
    payload.arguments?.command,
    payload.arguments?.cmd,
    payload.toolCall?.input?.command,
    payload.tool_call?.input?.command
  );
}

export function isRuntimeContractBootstrap(payload, rawPayload = '') {
  const toolName = getToolName(payload);
  if (!/^(?:apply_patch|Edit|Write)$/i.test(toolName ?? '')) return false;
  return rawPayload.includes(DEFAULT_RUNTIME_CONTRACT_PATH);
}

export function toolCallRequiresRuntimeContract(payload, rawPayload = '') {
  if (isRuntimeContractBootstrap(payload, rawPayload)) return { required: false, reason: 'runtime-contract-bootstrap' };

  const toolName = getToolName(payload);
  if (/^(?:apply_patch|Edit|Write)$/i.test(toolName ?? '')) {
    return { required: true, reason: 'file edit' };
  }

  if (/^Bash$/i.test(toolName ?? '')) {
    const command = getCommand(payload);
    if (!command) return { required: true, reason: 'unclassified Bash command' };
    return isReadOnlyCommand(command)
      ? { required: false, reason: 'read-only Bash command' }
      : { required: true, reason: 'non-trivial Bash command' };
  }

  return { required: false, reason: 'tool not governed by agentic runtime hook' };
}

export function isReadOnlyCommand(command) {
  const trimmed = command.trim();
  if (!trimmed || /[;&|<>`$]/.test(trimmed)) return false;
  return readOnlyCommandPatterns.some((pattern) => pattern.test(trimmed));
}

export function validateAgenticRuntimeContract(runtimeContract, pathContract) {
  const errors = [];
  if (!runtimeContract || typeof runtimeContract !== 'object' || Array.isArray(runtimeContract)) {
    return ['runtime contract: must be a JSON object'];
  }

  const selectedPath = runtimeContract.selectedPath;
  const pathDefinition = pathContract?.paths?.[selectedPath];
  if (!pathDefinition) {
    errors.push(`runtime contract: selectedPath ${String(selectedPath)} is not defined in rules/agentic-paths.json`);
    return errors;
  }

  for (const [label, key] of Object.entries(runtimeFieldMap)) {
    if (!Object.hasOwn(runtimeContract, key)) errors.push(`runtime contract: missing ${key} (${label})`);
  }

  for (const key of ['taskFacts', 'escalationRulesApplied', 'requiredStates', 'requiredFields', 'verification']) {
    if (Object.hasOwn(runtimeContract, key) && (!Array.isArray(runtimeContract[key]) || runtimeContract[key].length === 0)) {
      errors.push(`runtime contract: ${key} must be a non-empty array`);
    }
  }

  if (!runtimeContract.budgetEnvelope || typeof runtimeContract.budgetEnvelope !== 'object' || Array.isArray(runtimeContract.budgetEnvelope)) {
    errors.push('runtime contract: budgetEnvelope must be an object');
  }

  for (const state of pathDefinition.requiredStates ?? []) {
    if (!runtimeContract.requiredStates?.includes(state)) {
      errors.push(`runtime contract: requiredStates missing ${state}`);
    }
  }

  for (const field of pathDefinition.requiredFields ?? []) {
    if (!runtimeContract.requiredFields?.includes(field)) {
      errors.push(`runtime contract: requiredFields missing ${field}`);
    }
  }

  const pathOrder = pathContract.pathOrder ?? [];
  const selectedRank = pathOrder.indexOf(selectedPath);
  for (const ruleId of runtimeContract.escalationRulesApplied ?? []) {
    const rule = pathContract.escalationRules?.find((entry) => entry.id === ruleId);
    if (!rule) {
      errors.push(`runtime contract: unknown escalation rule ${ruleId}`);
      continue;
    }
    const minimumRank = pathOrder.indexOf(rule.minimumPath);
    if (selectedRank < minimumRank) {
      errors.push(`runtime contract: selectedPath ${selectedPath} is below escalation minimum ${rule.minimumPath}`);
    }
  }

  for (const key of ['taskClass', 'providerBudget', 'maxWriteAgents']) {
    if (!Object.hasOwn(runtimeContract.budgetEnvelope ?? {}, key)) {
      errors.push(`runtime contract: budgetEnvelope missing ${key}`);
    }
  }

  return errors;
}

export function buildComplianceReport(runtimeContract, options = {}) {
  const violations = options.violations ?? [];
  return {
    selectedPath: runtimeContract.selectedPath,
    escalationRulesApplied: runtimeContract.escalationRulesApplied,
    requiredStates: violations.some((violation) => violation.includes('requiredStates')) ? 'failed' : 'satisfied',
    requiredFields: violations.some((violation) => violation.includes('requiredFields')) ? 'failed' : 'satisfied',
    budgetEnvelope: violations.some((violation) => violation.includes('budgetEnvelope')) ? 'failed' : 'satisfied',
    verification: options.verification ?? runtimeContract.verification,
    hookEnforcement: options.hookEnforcement ?? 'configured',
    violations
  };
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}
