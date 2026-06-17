import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  findRepositoryRoot,
  getToolName,
  parseHookPayload,
  readJsonFile,
  readStdin,
  toolCallRequiresRuntimeContract,
  validateAgenticRuntimeContract
} from './agentic-lean-path-runtime.mjs';
import { compareCodeUnits } from './governance/validators.mjs';

export const DEFAULT_WORKFLOW_EVENTS_CONTRACT_PATH = path.join('contracts', 'governance', 'agentic-workflow-events.json');
export const DEFAULT_WORKFLOW_EVENTS_PATH = path.join('reports', 'agentic-workflow-events.jsonl');
export const DEFAULT_WORKFLOW_CURRENT_RUN_PATH = path.join('reports', 'agentic-workflow-current.json');

export async function appendWorkflowEvent(root, event, eventsPath = DEFAULT_WORKFLOW_EVENTS_PATH) {
  const absoluteEventsPath = path.resolve(root, eventsPath);
  await fs.mkdir(path.dirname(absoluteEventsPath), { recursive: true });
  await fs.appendFile(absoluteEventsPath, `${JSON.stringify(normalizeWorkflowEvent(event))}\n`);
}

export async function readWorkflowEvents(root, eventsPath = DEFAULT_WORKFLOW_EVENTS_PATH) {
  try {
    const contents = await fs.readFile(path.resolve(root, eventsPath), 'utf8');
    return contents
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export async function readCurrentWorkflowRun(root, currentRunPath = DEFAULT_WORKFLOW_CURRENT_RUN_PATH) {
  try {
    return await readJsonFile(path.resolve(root, currentRunPath));
  } catch {
    return null;
  }
}

export function normalizeWorkflowEvent(event) {
  return {
    event: event.event,
    timestamp: event.timestamp ?? new Date().toISOString(),
    source: event.source ?? 'runtime',
    state: event.state ?? stateFromEventName(event.event),
    ...Object.fromEntries(Object.entries(event).filter(([key]) =>
      !['event', 'timestamp', 'source', 'state'].includes(key)
    ))
  };
}

export function validateWorkflowEventsContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['contracts/governance/agentic-workflow-events.json: contract must be a JSON object'];
  }
  if (contract.version !== 1) errors.push('contracts/governance/agentic-workflow-events.json: version must be 1');
  if (contract.contractName !== 'Agentic Workflow Events') {
    errors.push('contracts/governance/agentic-workflow-events.json: contractName must be Agentic Workflow Events');
  }
  if (contract.report?.path !== DEFAULT_WORKFLOW_EVENTS_PATH) {
    errors.push(`contracts/governance/agentic-workflow-events.json: report.path must be ${DEFAULT_WORKFLOW_EVENTS_PATH}`);
  }
  if (contract.currentRun?.path !== DEFAULT_WORKFLOW_CURRENT_RUN_PATH) {
    errors.push(`contracts/governance/agentic-workflow-events.json: currentRun.path must be ${DEFAULT_WORKFLOW_CURRENT_RUN_PATH}`);
  }
  for (const field of ['event', 'timestamp', 'source', 'state']) {
    if (!contract.report?.requiredFields?.includes(field)) {
      errors.push(`contracts/governance/agentic-workflow-events.json: report.requiredFields missing ${field}`);
    }
  }
  for (const eventName of ['intake.started', 'workflow.started', 'agent.started', 'agent.completed', 'workflow.completed', 'workflow.violation']) {
    if (!contract.events?.[eventName]) {
      errors.push(`contracts/governance/agentic-workflow-events.json: events missing ${eventName}`);
    }
  }
  const highChange = contract.pathAgentRequirements?.['high-change'];
  for (const requirement of [
    ['beforeMutatingToolUse', 'planner', 'agent.completed'],
    ['beforeMutatingToolUse', 'implementer', 'agent.started'],
    ['beforeWorkflowCompletion', 'verifier', 'agent.completed']
  ]) {
    const [phase, agent, event] = requirement;
    if (!highChange?.[phase]?.some((entry) => entry.agent === agent && entry.event === event)) {
      errors.push(`contracts/governance/agentic-workflow-events.json: high-change.${phase} missing ${agent}.${event}`);
    }
  }
  return errors.sort(compareCodeUnits);
}

export function validateWorkflowEvents(events, contract, runtimeContract = null, options = {}) {
  const errors = [];
  const requiredFields = contract.report?.requiredFields ?? [];
  for (const [index, event] of events.entries()) {
    for (const field of requiredFields) {
      if (!Object.hasOwn(event, field)) errors.push(`workflow event ${index + 1}: missing ${field}`);
    }
    const eventContract = contract.events?.[event.event];
    if (!eventContract) errors.push(`workflow event ${index + 1}: unknown event ${String(event.event)}`);
    for (const field of eventContract?.requiredFields ?? []) {
      if (!Object.hasOwn(event, field)) errors.push(`workflow event ${index + 1}: ${event.event} missing ${field}`);
    }
  }

  if (options.requireIntake && !hasEvent(events, { event: 'intake.started' })) {
    errors.push('agentic workflow: intake.started is required before governed work');
  }
  if (options.requireStarted && !hasEvent(events, { event: 'workflow.started' })) {
    errors.push('agentic workflow: workflow.started is required before governed work');
  }

  const selectedPath = runtimeContract?.selectedPath;
  if (selectedPath) {
    const pathRequirements = contract.pathAgentRequirements?.[selectedPath] ?? {};
    const phase = options.phase;
    for (const requirement of pathRequirements[phase] ?? []) {
      if (!hasEvent(events, requirement)) {
        errors.push(`agentic workflow: ${selectedPath} requires ${requirement.agent}.${requirement.event} before ${phase}`);
      }
    }
  }

  return errors.sort(compareCodeUnits);
}

export function buildWorkflowStatus(events, runtimeContract = null, contract = null) {
  const currentEvent = events.at(-1) ?? null;
  const currentState = currentEvent?.state ?? 'not-started';
  const selectedPath = runtimeContract?.selectedPath ?? 'none';
  const agents = ['planner', 'implementer', 'verifier', 'reviewer'].map((agent) => ({
    agent,
    started: hasEvent(events, { event: 'agent.started', agent }),
    completed: hasEvent(events, { event: 'agent.completed', agent })
  }));
  const requirements = contract?.pathAgentRequirements?.[selectedPath] ?? {};
  const missingMutating = (requirements.beforeMutatingToolUse ?? []).filter((requirement) =>
    !hasEvent(events, requirement)
  );
  const missingCompletion = (requirements.beforeWorkflowCompletion ?? []).filter((requirement) =>
    !hasEvent(events, requirement)
  );
  return {
    selectedPath,
    currentState,
    currentEvent: currentEvent?.event ?? 'none',
    intakeStarted: hasEvent(events, { event: 'intake.started' }),
    agents,
    missingBeforeMutatingToolUse: missingMutating,
    missingBeforeWorkflowCompletion: missingCompletion,
    activeViolations: uniqueSorted(events.slice(lastWorkflowStartIndex(events))
      .filter((event) => event.event === 'workflow.violation')
      .flatMap((event) => event.violations ?? []))
  };
}

export function formatWorkflowStatus(status) {
  return [
    `Path: ${status.selectedPath}`,
    `Current state: ${status.currentState}`,
    `Current event: ${status.currentEvent}`,
    `Intake: ${status.intakeStarted ? 'started' : 'missing'}`,
    'Agents:',
    ...status.agents.map(({ agent, started, completed }) =>
      `  ${agent}: ${completed ? 'completed' : started ? 'started' : 'pending'}`
    ),
    `Missing before mutating tool use: ${formatRequirements(status.missingBeforeMutatingToolUse)}`,
    `Missing before completion: ${formatRequirements(status.missingBeforeWorkflowCompletion)}`,
    `Active violations: ${status.activeViolations.length === 0 ? 'none' : status.activeViolations.join('; ')}`
  ].join('\n');
}

export async function runWorkflowHook(eventName, rawPayload, options = {}) {
  const root = await findRepositoryRoot(process.cwd());
  const payload = parseHookPayload(rawPayload);
  const eventsPath = process.env.AGENTIC_WORKFLOW_EVENTS_PATH ?? DEFAULT_WORKFLOW_EVENTS_PATH;
  const currentRunPath = process.env.AGENTIC_WORKFLOW_CURRENT_RUN_PATH ?? currentRunPathForEvents(eventsPath);
  const contract = await readJsonFile(path.resolve(root, options.contractPath ?? DEFAULT_WORKFLOW_EVENTS_CONTRACT_PATH));
  const runtimeContractPath = process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH;
  const runtimeContract = await readOptionalJson(path.resolve(root, runtimeContractPath));

  if (eventName === 'UserPromptSubmit') {
    const promptHash = hashString(rawPayload);
    const run = {
      runId: `${Date.now()}-${promptHash}`,
      promptHash,
      startedAt: new Date().toISOString()
    };
    await writeCurrentWorkflowRun(root, run, currentRunPath);
    await appendWorkflowEvent(root, {
      event: 'intake.started',
      source: 'UserPromptSubmit',
      runId: run.runId,
      promptHash,
      state: 'intake'
    }, eventsPath);
    return [];
  }

  const currentRun = await readCurrentWorkflowRun(root, currentRunPath);
  if (eventName === 'SubagentStart') {
    await appendWorkflowEvent(root, {
      event: 'agent.started',
      source: 'SubagentStart',
      runId: currentRun?.runId,
      agent: getAgentName(payload),
      state: stateForAgent(getAgentName(payload))
    }, eventsPath);
    return [];
  }

  if (eventName === 'SubagentStop') {
    await appendWorkflowEvent(root, {
      event: 'agent.completed',
      source: 'SubagentStop',
      runId: currentRun?.runId,
      agent: getAgentName(payload),
      state: stateForAgent(getAgentName(payload))
    }, eventsPath);
    return [];
  }

  const events = eventsForRun(await readWorkflowEvents(root, eventsPath), currentRun);
  if (eventName === 'PreToolUse') {
    const requirement = toolCallRequiresRuntimeContract(payload, rawPayload);
    if (!requirement.required) return [];
    const errors = validateWorkflowEvents(events, contract, runtimeContract, {
      requireIntake: true,
      requireStarted: true,
      phase: 'beforeMutatingToolUse'
    });
    if (errors.length > 0) await appendWorkflowViolation(root, currentRun, 'beforeMutatingToolUse', errors, eventsPath);
    return errors;
  }

  if (eventName === 'Stop') {
    const errors = validateWorkflowEvents(events, contract, runtimeContract, {
      requireIntake: true,
      requireStarted: true,
      phase: 'beforeWorkflowCompletion'
    });
    if (errors.length > 0) await appendWorkflowViolation(root, currentRun, 'beforeWorkflowCompletion', errors, eventsPath);
    if (errors.length === 0) {
      await appendWorkflowEvent(root, {
        event: 'workflow.completed',
        source: 'Stop',
        runId: currentRun?.runId,
        state: 'handoff'
      }, eventsPath);
    }
    return errors;
  }

  return [];
}

export async function startWorkflow(root, options = {}) {
  const repositoryRoot = path.resolve(root);
  const workflowContract = await readJsonFile(path.resolve(repositoryRoot, DEFAULT_WORKFLOW_EVENTS_CONTRACT_PATH));
  const pathContract = await readJsonFile(path.resolve(repositoryRoot, 'contracts', 'governance', 'agentic-paths.json'));
  const selectedPath = options.selectedPath ?? 'high-change';
  const pathDefinition = pathContract.paths?.[selectedPath];
  if (!pathDefinition) throw new Error(`Unknown workflow path: ${selectedPath}`);

  const eventsPath = options.eventsPath ?? DEFAULT_WORKFLOW_EVENTS_PATH;
  const currentRunPath = options.currentRunPath ?? currentRunPathForEvents(eventsPath);
  const runtimeContractPath = options.runtimeContractPath ?? DEFAULT_RUNTIME_CONTRACT_PATH;
  let currentRun = await readCurrentWorkflowRun(repositoryRoot, currentRunPath);
  if (!currentRun?.runId) {
    const promptHash = hashString(options.task ?? selectedPath);
    currentRun = {
      runId: `${Date.now()}-${promptHash}`,
      promptHash,
      startedAt: new Date().toISOString()
    };
    await writeCurrentWorkflowRun(repositoryRoot, currentRun, currentRunPath);
    await appendWorkflowEvent(repositoryRoot, {
      event: 'intake.started',
      source: 'workflow:start',
      runId: currentRun.runId,
      promptHash,
      state: 'intake'
    }, eventsPath);
  }

  const runtimeContract = buildRuntimeContract(selectedPath, pathDefinition, options.task);
  const runtimeAbsolutePath = path.resolve(repositoryRoot, runtimeContractPath);
  await fs.mkdir(path.dirname(runtimeAbsolutePath), { recursive: true });
  await fs.writeFile(runtimeAbsolutePath, `${JSON.stringify(runtimeContract, null, 2)}\n`);
  const validationErrors = validateAgenticRuntimeContract(runtimeContract, pathContract);
  if (validationErrors.length > 0) throw new Error(validationErrors.join('\n'));
  await appendWorkflowEvent(repositoryRoot, {
    event: 'workflow.started',
    source: 'workflow:start',
    runId: currentRun.runId,
    state: workflowContract.events?.['workflow.started']?.state ?? 'routing',
    selectedPath,
    runtimeContractPath
  }, eventsPath);
  return { currentRun, runtimeContract };
}

async function readOptionalJson(filePath) {
  try {
    return await readJsonFile(filePath);
  } catch {
    return null;
  }
}

function getAgentName(payload) {
  return firstString(
    payload.subagentType,
    payload.subagent_type,
    payload.subagent?.name,
    payload.subagent?.type,
    payload.agent,
    payload.agent?.name,
    payload.agent?.type,
    payload.agentName,
    payload.agent_name,
    payload.name,
    payload.type
  ) ?? 'unknown';
}

async function writeCurrentWorkflowRun(root, run, currentRunPath) {
  const absolutePath = path.resolve(root, currentRunPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(run, null, 2)}\n`);
}

async function appendWorkflowViolation(root, currentRun, phase, violations, eventsPath) {
  await appendWorkflowEvent(root, {
    event: 'workflow.violation',
    source: phase === 'beforeWorkflowCompletion' ? 'Stop' : 'PreToolUse',
    runId: currentRun?.runId,
    state: 'repair-loop',
    phase,
    violations
  }, eventsPath);
}

function eventsForRun(events, currentRun) {
  if (!currentRun?.runId) return events;
  const scopedEvents = events.filter((event) => event.runId === currentRun.runId);
  return scopedEvents.length === 0 ? events : scopedEvents;
}

function buildRuntimeContract(selectedPath, pathDefinition, task = '') {
  return {
    selectedPath,
    taskFacts: [task || `workflow:start selected ${selectedPath}`],
    escalationRulesApplied: selectedPath === 'release'
      ? ['no-matching-path']
      : ['touches-agentic-workflow-governance'],
    requiredStates: pathDefinition.requiredStates,
    requiredFields: pathDefinition.requiredFields,
    budgetEnvelope: {
      taskClass: selectedPath === 'release' ? 'release' : selectedPath.replace(/-change$/, ''),
      providerBudget: 'coordinator-only',
      maxWriteAgents: 1
    },
    verification: pathDefinition.verification
  };
}

function lastWorkflowStartIndex(events) {
  const index = events.findLastIndex((event) => event.event === 'workflow.started');
  return index === -1 ? 0 : index;
}

function currentRunPathForEvents(eventsPath) {
  if (eventsPath === DEFAULT_WORKFLOW_EVENTS_PATH) return DEFAULT_WORKFLOW_CURRENT_RUN_PATH;
  return path.join(path.dirname(eventsPath), 'agentic-workflow-current.json');
}

function stateForAgent(agent) {
  if (agent === 'planner') return 'planning';
  if (agent === 'verifier' || agent === 'reviewer') return 'verification';
  return 'execution';
}

function stateFromEventName(eventName) {
  if (eventName === 'intake.started') return 'intake';
  if (eventName === 'workflow.completed') return 'handoff';
  return 'execution';
}

function hasEvent(events, requirement) {
  return events.some((event) =>
    Object.entries(requirement).every(([key, value]) => event[key] === value)
  );
}

function formatRequirements(requirements) {
  return requirements.length === 0
    ? 'none'
    : requirements.map((requirement) => `${requirement.agent}.${requirement.event}`).join(', ');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort(compareCodeUnits);
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return String(hash >>> 0);
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

async function runCli() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const command = process.argv[2] ?? 'status';
  const contract = await readJsonFile(path.resolve(root, DEFAULT_WORKFLOW_EVENTS_CONTRACT_PATH));
  if (command === 'validate-contract') {
    const errors = validateWorkflowEventsContract(contract);
    if (errors.length > 0) {
      console.error('Agentic workflow events contract validation failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log('Agentic workflow events contract validation passed.');
    return;
  }
  const runtimeContract = await readOptionalJson(path.resolve(root, process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH));
  const eventsPath = process.env.AGENTIC_WORKFLOW_EVENTS_PATH ?? DEFAULT_WORKFLOW_EVENTS_PATH;
  const currentRun = await readCurrentWorkflowRun(root, process.env.AGENTIC_WORKFLOW_CURRENT_RUN_PATH ?? currentRunPathForEvents(eventsPath));
  const events = eventsForRun(await readWorkflowEvents(root, eventsPath), currentRun);
  if (command === 'start') {
    const options = parseStartArguments(process.argv.slice(3));
    const result = await startWorkflow(root, options);
    console.log(`Workflow started: ${result.currentRun.runId}`);
    console.log(`Path: ${result.runtimeContract.selectedPath}`);
    console.log(`Runtime contract: ${options.runtimeContractPath ?? DEFAULT_RUNTIME_CONTRACT_PATH}`);
    return;
  }
  if (command === 'validate' || command === 'verify') {
    const errors = validateWorkflowEvents(events, contract, runtimeContract, { requireIntake: events.length > 0 });
    if (command === 'verify') {
      errors.push(...validateWorkflowEvents(events, contract, runtimeContract, {
        requireIntake: true,
        requireStarted: true,
        phase: 'beforeWorkflowCompletion'
      }));
    }
    if (errors.length > 0) {
      console.error('Agentic workflow events validation failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log('Agentic workflow events validation passed.');
    return;
  }
  if (command !== 'status') {
    console.error(`Unknown workflow command: ${command}`);
    process.exitCode = 1;
    return;
  }
  console.log(formatWorkflowStatus(buildWorkflowStatus(events, runtimeContract, contract)));
}

function parseStartArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--path') options.selectedPath = argumentsList[index += 1];
    else if (argument === '--task') options.task = argumentsList[index += 1];
    else if (argument === '--runtime-contract') options.runtimeContractPath = argumentsList[index += 1];
    else if (argument === '--events') options.eventsPath = argumentsList[index += 1];
    else throw new Error(`Unknown workflow:start argument: ${argument}`);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
