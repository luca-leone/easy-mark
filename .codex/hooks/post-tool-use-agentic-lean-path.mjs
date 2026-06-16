#!/usr/bin/env node
// Agentic lean path postflight hook: records governed tool calls and triggers repair mode when execution violates the JSON runtime contract.
import path from 'node:path';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  DEFAULT_TOOL_USE_REPORT_PATH,
  appendToolUseReport,
  buildToolUseReportEntry,
  findRepositoryRoot,
  parseHookPayload,
  readJsonFile,
  readStdin,
  toolCallRequiresRuntimeContract,
  validateAgenticRuntimeContract
} from '../../script/agentic-lean-path-runtime.mjs';

const rawPayload = await readStdin();
const payload = parseHookPayload(rawPayload);
const requirement = toolCallRequiresRuntimeContract(payload, rawPayload);

if (!requirement.required) process.exit(0);

const root = await findRepositoryRoot(process.cwd());
const runtimeContractPath = process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH;
const toolUseReportPath = process.env.AGENTIC_TOOL_USE_REPORT_PATH ?? DEFAULT_TOOL_USE_REPORT_PATH;

try {
  const [pathContract, runtimeContract] = await Promise.all([
    readJsonFile(path.join(root, 'rules', 'agentic-paths.json')),
    readJsonFile(path.resolve(root, runtimeContractPath))
  ]);
  const validationErrors = validateAgenticRuntimeContract(runtimeContract, pathContract);
  const reportEntry = buildToolUseReportEntry(payload, runtimeContract, validationErrors, {
    event: 'PostToolUse',
    requirement
  });
  await appendToolUseReport(root, reportEntry, toolUseReportPath);
  if (reportEntry.violations.length === 0) process.exit(0);
  deny('Agentic lean path PostToolUse detected a contract violation; enter repair mode.', reportEntry.violations);
} catch (error) {
  const violations = [
    `Expected ${runtimeContractPath}.`,
    error instanceof SyntaxError ? 'Runtime contract JSON is malformed.' : 'Runtime contract file is missing or unreadable.'
  ];
  await appendToolUseReport(root, {
    event: 'PostToolUse',
    tool: 'unknown',
    contractPath: null,
    required: true,
    requirementReason: requirement.reason,
    contractValid: false,
    toolOutcome: 'observed',
    requiredRepair: true,
    violations
  }, toolUseReportPath);
  deny('Agentic lean path PostToolUse could not verify the runtime contract; enter repair mode.', violations);
}

function deny(message, details) {
  console.error(message);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}
