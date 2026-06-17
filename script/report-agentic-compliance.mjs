import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  DEFAULT_TOOL_USE_REPORT_PATH,
  buildComplianceReport,
  readJsonFile,
  readToolUseReport,
  validateAgenticRuntimeContract
} from './agentic-lean-path-runtime.mjs';
import {
  DEFAULT_WORKFLOW_EVENTS_PATH,
  buildWorkflowStatus,
  readWorkflowEvents,
  validateWorkflowEvents
} from './agentic-workflow-runtime.mjs';

export async function buildAgenticComplianceReport(rootDirectory, runtimeContractPath = DEFAULT_RUNTIME_CONTRACT_PATH, options = {}) {
  const root = path.resolve(rootDirectory);
  const toolUseReportPath = options.toolUseReportPath ?? DEFAULT_TOOL_USE_REPORT_PATH;
  const workflowEventsPath = options.workflowEventsPath ?? DEFAULT_WORKFLOW_EVENTS_PATH;
  const [pathContract, runtimeContract] = await Promise.all([
    readJsonFile(path.join(root, 'contracts', 'governance', 'agentic-paths.json')),
    readJsonFile(path.resolve(root, runtimeContractPath))
  ]);
  const workflowEventsContract = await readJsonFile(path.join(root, 'contracts', 'governance', 'agentic-workflow-events.json'));
  const violations = validateAgenticRuntimeContract(runtimeContract, pathContract);
  const toolUseEntries = await readToolUseReport(root, toolUseReportPath);
  const workflowEvents = await readWorkflowEvents(root, workflowEventsPath);
  const workflowViolations = validateWorkflowEvents(workflowEvents, workflowEventsContract, runtimeContract, {
    requireIntake: workflowEvents.length > 0
  });
  const report = buildComplianceReport(runtimeContract, {
    violations: [...violations, ...workflowViolations],
    toolUseEntries,
    hookMonitoring: options.hookMonitoring ?? 'PreToolUse and PostToolUse configured',
    hookViolationPolicy: options.hookViolationPolicy ?? 'violations trigger repair mode',
    verification: options.verification ?? runtimeContract.verification
  });
  return {
    ...report,
    workflowStatus: buildWorkflowStatus(workflowEvents, runtimeContract, workflowEventsContract)
  };
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const runtimeContractPath = process.argv[2] ?? process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH;
  const toolUseReportPath = process.env.AGENTIC_TOOL_USE_REPORT_PATH ?? DEFAULT_TOOL_USE_REPORT_PATH;
  const workflowEventsPath = process.env.AGENTIC_WORKFLOW_EVENTS_PATH ?? DEFAULT_WORKFLOW_EVENTS_PATH;
  const report = await buildAgenticComplianceReport(rootDirectory, runtimeContractPath, { toolUseReportPath, workflowEventsPath });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
