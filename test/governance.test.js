import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  compareCodeUnits,
  validateAdrDocument,
  validateAgentDocument,
  validateAgentEntries,
  validateAgenticWorkflowGuide,
  validateAutoCommitSkill,
  validateCodexConfig,
  validateContextBudgetSkill,
  validateDecisionMemory,
  validateDocumentationScope,
  validateGenerateCommitSkill,
  validateGovernance,
  validateInternalLinks,
  validateMarkdownLineBudgets,
  validateMarkdownGovernance,
  validateMarkdownGovernanceContract,
  validateMarkdownGovernanceEntries,
  validateMarkdownGovernanceHookConfig,
  validateMarkdownGovernanceHookScript,
  validateMarkdownGovernancePolicy,
  validateAgenticHookConfig,
  validateAgenticHookScript,
  validateAgenticPathContract,
  validateAgenticWorkflowPolicy,
  validateOrchestrateRequestSkill,
  validateQualityGateSkill,
  validateResourceBudgetGateSkill,
  validateResourceBudgetPolicy,
  validateWorkflowScriptPaths
} from '../script/validate-governance.mjs';
import { validateAgenticWorkflow } from '../script/validate-agentic-workflow.mjs';
import { validateAgenticPaths } from '../script/validate-agentic-paths.mjs';
import { validateAgenticRuntimeContractFile } from '../script/validate-agentic-lean-path-runtime.mjs';
import { validateResourceBudgets } from '../script/validate-resource-budgets.mjs';
import { buildAgenticComplianceReport } from '../script/report-agentic-compliance.mjs';

test('repository governance is valid', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  assert.deepEqual(await validateGovernance(rootDirectory), []);
});

test('rejects malformed ADR documents', () => {
  const errors = validateAdrDocument('1-bad_name.md', '# Decision\n\n## Status\n\nAccepted');
  assert.ok(errors.some((error) => error.includes('filename')));
  assert.ok(errors.some((error) => error.includes('title')));
  assert.ok(errors.some((error) => error.includes('## Context')));
});

test('rejects malformed decision entries', () => {
  const contents = '# Decisions\n\n- 2026-02-30 | Unknown | A decision | ADR-1';
  const errors = validateDecisionMemory(contents);
  assert.ok(errors.some((error) => error.includes('invalid entry')));
});

test('detects broken local Markdown links', async (context) => {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'governance-links-'));
  context.after(() => fs.rm(rootDirectory, { recursive: true, force: true }));
  const filePath = path.join(rootDirectory, 'document.md');
  await fs.writeFile(filePath, '[Missing](missing.md)');

  const errors = await validateInternalLinks(rootDirectory, [filePath]);
  assert.deepEqual(errors, ['document.md: broken link missing.md']);
});

test('validates context monitor thresholds and explicit invocation', () => {
  const skill = `---
name: context-budget-monitor
description: Monitor context.
---
Never invent counts. Use /status at 50%, 30%, and 15%, then recommend /compact.
`;
  assert.deepEqual(validateContextBudgetSkill(skill, 'policy:\n  allow_implicit_invocation: false\n'), []);
  assert.ok(validateContextBudgetSkill(skill.replace('15%', '10%'), 'policy:\n  allow_implicit_invocation: true\n').length >= 2);
});

test('requires staged semantic analysis and explicit invocation for commit generation', () => {
  const skill = `---
name: generate-commit
description: Generate a commit.
---
Inspect git diff --cached and require explicit approval before committing.
`;
  assert.deepEqual(validateGenerateCommitSkill(skill, 'policy:\n  allow_implicit_invocation: false\n'), []);
  assert.ok(validateGenerateCommitSkill(skill.replace('git diff --cached', 'git status'), 'policy:\n  allow_implicit_invocation: true\n').length >= 2);
});

test('validates deterministic automatic commit skill', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const skill = await fs.readFile(path.join(rootDirectory, '.agents', 'skills', 'auto-commit', 'SKILL.md'), 'utf8');
  const metadata = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'auto-commit', 'agents', 'openai.yaml'),
    'utf8'
  );

  assert.deepEqual(validateAutoCommitSkill(skill, metadata), []);
  assert.ok(validateAutoCommitSkill(
    skill.replaceAll('npm run task:commit', 'manual git commit'),
    metadata.replace('allow_implicit_invocation: false', 'allow_implicit_invocation: true')
  ).length >= 2);
});


test('requires native context telemetry in Codex status line', () => {
  const agentConfig = '[agents]\nmax_threads = 4\nmax_depth = 1\n\n';
  assert.deepEqual(validateCodexConfig(`${agentConfig}[tui]\nstatus_line = ["model", "context-remaining"]\n`), []);
  assert.deepEqual(validateCodexConfig(`${agentConfig}[tui]\nstatus_line = ["model"]\n`), [
    '.codex/config.toml: status_line must include context-remaining'
  ]);
});

test('validates project agent model and sandbox boundaries', () => {
  const planner = `name = "planner"
description = "Plan work."
model = "gpt-5.5"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Inspect and plan without editing. Follow ADR-0033 and ADR-0035. Emit a Budget Envelope.
"""
`;

  assert.deepEqual(validateAgentDocument('planner.toml', planner), []);
  assert.ok(validateAgentDocument('planner.toml', planner.replace('read-only', 'workspace-write'))
    .some((error) => error.includes('sandbox_mode')));
  assert.ok(validateAgentDocument('planner.toml', planner.replace('gpt-5.5', 'gpt-5.4-mini'))
    .some((error) => error.includes('model must be')));
});

test('planner workflow requires user approval before execution', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const workflowPolicy = await fs.readFile(path.join(rootDirectory, 'rules', 'agentic-workflow.md'), 'utf8');
  const planner = await fs.readFile(path.join(rootDirectory, '.codex', 'agents', 'planner.toml'), 'utf8');

  assert.match(workflowPolicy, /define the plan, get explicit user approval for that plan, then execute/);
  assert.match(planner, /define the plan, wait for explicit user approval of that plan, and only then allow execution/);
});

test('requires deterministic workflow state machine, budget, routing, repair, and handoff gates', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const guide = await fs.readFile(path.join(rootDirectory, 'AGENTS.md'), 'utf8');
  const policy = await fs.readFile(path.join(rootDirectory, 'rules', 'agentic-workflow.md'), 'utf8');

  assert.deepEqual(validateAgenticWorkflowGuide(guide), []);
  assert.deepEqual(validateAgenticWorkflowPolicy(policy), []);
  assert.deepEqual(await validateAgenticWorkflow(rootDirectory), []);
  assert.match(policy, /budget-gate/);
  assert.match(policy, /agentic-paths\.json/);
  assert.match(policy, /\$resource-budget-gate/);
  assert.ok(validateAgenticWorkflowPolicy(policy.replace('Repair Loop', 'Fixing')).some((error) =>
    error.includes('Repair Loop')
  ));
});

test('validates deterministic agentic path contract', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const contract = JSON.parse(await fs.readFile(path.join(rootDirectory, 'contracts', 'governance', 'agentic-paths.json'), 'utf8'));

  assert.deepEqual(validateAgenticPathContract(contract), []);
  assert.deepEqual(await validateAgenticPaths(rootDirectory), []);

  const missingRuntimeField = structuredClone(contract);
  missingRuntimeField.runtimeContract.requiredFields =
    missingRuntimeField.runtimeContract.requiredFields.filter((field) => field !== 'Selected Path');
  assert.ok(validateAgenticPathContract(missingRuntimeField).some((error) => error.includes('Selected Path')));

  const missingBudgetGate = structuredClone(contract);
  missingBudgetGate.paths['high-change'].requiredStates =
    missingBudgetGate.paths['high-change'].requiredStates.filter((state) => state !== 'budget-gate');
  assert.ok(validateAgenticPathContract(missingBudgetGate).some((error) => error.includes('budget-gate')));
});

test('validates agentic runtime contract and lean path hook monitoring', async (context) => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'agentic-runtime-'));
  context.after(() => fs.rm(temporaryDirectory, { recursive: true, force: true }));
  const runtimePath = path.join(temporaryDirectory, 'runtime.json');
  const validRuntime = {
    selectedPath: 'high-change',
    taskFacts: ['touches agentic-workflow governance'],
    escalationRulesApplied: ['touches-agentic-workflow-governance'],
    requiredStates: [
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
    ],
    requiredFields: [
      'Task Classification',
      'Risk',
      'Source Documents',
      'Requirements',
      'Budget Envelope',
      'Routing',
      'Acceptance Criteria',
      'Execution Steps',
      'Verification Matrix',
      'Repair Triggers',
      'Handoff Gate'
    ],
    budgetEnvelope: {
      taskClass: 'high',
      providerBudget: 'coordinator-only',
      maxWriteAgents: 1
    },
    verification: ['npm test']
  };
  await fs.writeFile(runtimePath, JSON.stringify(validRuntime, null, 2));

  assert.deepEqual(await validateAgenticRuntimeContractFile(rootDirectory, runtimePath), []);

  const preHookScript = path.join(rootDirectory, '.codex', 'hooks', 'pre-tool-use-agentic-lean-path.mjs');
  const postHookScript = path.join(rootDirectory, '.codex', 'hooks', 'post-tool-use-agentic-lean-path.mjs');
  const readOnly = spawnSync(process.execPath, [preHookScript], {
    cwd: rootDirectory,
    input: JSON.stringify({ toolName: 'Bash', input: { command: 'git status --short' } })
  });
  assert.equal(readOnly.status, 0);

  const missingContract = spawnSync(process.execPath, [preHookScript], {
    cwd: rootDirectory,
    env: { ...process.env, AGENTIC_RUNTIME_CONTRACT_PATH: path.join(temporaryDirectory, 'missing.json') },
    input: JSON.stringify({ toolName: 'apply_patch', input: { patch: '*** Begin Patch\n*** End Patch\n' } })
  });
  assert.equal(missingContract.status, 1);
  assert.match(missingContract.stderr.toString(), /missing before file edit; enter repair mode/);

  const validContract = spawnSync(process.execPath, [preHookScript], {
    cwd: rootDirectory,
    env: { ...process.env, AGENTIC_RUNTIME_CONTRACT_PATH: runtimePath },
    input: JSON.stringify({ toolName: 'apply_patch', input: { patch: '*** Begin Patch\n*** End Patch\n' } })
  });
  assert.equal(validContract.status, 0);

  const reportPath = path.join(temporaryDirectory, 'tool-use.jsonl');
  const postValid = spawnSync(process.execPath, [postHookScript], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      AGENTIC_RUNTIME_CONTRACT_PATH: runtimePath,
      AGENTIC_TOOL_USE_REPORT_PATH: reportPath
    },
    input: JSON.stringify({ toolName: 'apply_patch', status: 'success', input: { patch: '*** Begin Patch\n*** End Patch\n' } })
  });
  assert.equal(postValid.status, 0);
  const reportEntries = (await fs.readFile(reportPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(reportEntries.length, 1);
  assert.equal(reportEntries[0].event, 'PostToolUse');
  assert.equal(reportEntries[0].requiredRepair, false);
  const complianceReport = await buildAgenticComplianceReport(rootDirectory, runtimePath, {
    toolUseReportPath: reportPath
  });
  assert.equal(complianceReport.governedToolUses, 1);
  assert.equal(complianceReport.postToolViolations, 0);
  assert.deepEqual(complianceReport.violations, []);

  const invalidRuntimePath = path.join(temporaryDirectory, 'invalid-runtime.json');
  await fs.writeFile(invalidRuntimePath, JSON.stringify({ ...validRuntime, selectedPath: 'low-change' }, null, 2));
  const postInvalid = spawnSync(process.execPath, [postHookScript], {
    cwd: rootDirectory,
    env: {
      ...process.env,
      AGENTIC_RUNTIME_CONTRACT_PATH: invalidRuntimePath,
      AGENTIC_TOOL_USE_REPORT_PATH: path.join(temporaryDirectory, 'invalid-tool-use.jsonl')
    },
    input: JSON.stringify({ toolName: 'apply_patch', status: 'success', input: { patch: '*** Begin Patch\n*** End Patch\n' } })
  });
  assert.equal(postInvalid.status, 1);
  assert.match(postInvalid.stderr.toString(), /PostToolUse detected a contract violation; enter repair mode/);
});

test('validates agentic hook configuration and script wiring', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const hookConfig = JSON.parse(await fs.readFile(path.join(rootDirectory, '.codex', 'hooks.json'), 'utf8'));
  const preHookScript = await fs.readFile(
    path.join(rootDirectory, '.codex', 'hooks', 'pre-tool-use-agentic-lean-path.mjs'),
    'utf8'
  );
  const postHookScript = await fs.readFile(
    path.join(rootDirectory, '.codex', 'hooks', 'post-tool-use-agentic-lean-path.mjs'),
    'utf8'
  );

  assert.deepEqual(validateAgenticHookConfig(hookConfig), []);
  assert.deepEqual(validateAgenticHookScript(preHookScript), []);
  assert.deepEqual(validateAgenticHookScript(postHookScript), []);
  const brokenConfig = structuredClone(hookConfig);
  brokenConfig.hooks.PreToolUse = brokenConfig.hooks.PreToolUse.filter((entry) => entry.matcher !== '^Bash$');
  assert.ok(validateAgenticHookConfig(brokenConfig).some((error) => error.includes('^Bash$')));
});

test('validates Markdown governance contract, hooks, reports, and repair trigger', async (context) => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-governance-'));
  context.after(() => fs.rm(temporaryDirectory, { recursive: true, force: true }));
  const contract = JSON.parse(await fs.readFile(path.join(rootDirectory, 'contracts', 'governance', 'markdown-governance.json'), 'utf8'));
  const policy = await fs.readFile(path.join(rootDirectory, 'rules', 'markdown-governance.md'), 'utf8');
  const hookConfig = JSON.parse(await fs.readFile(path.join(rootDirectory, '.codex', 'hooks.json'), 'utf8'));
  const preHookScript = await fs.readFile(
    path.join(rootDirectory, '.codex', 'hooks', 'pre-tool-use-markdown-governance.mjs'),
    'utf8'
  );
  const postHookScript = await fs.readFile(
    path.join(rootDirectory, '.codex', 'hooks', 'post-tool-use-markdown-governance.mjs'),
    'utf8'
  );

  assert.deepEqual(validateMarkdownGovernanceContract(contract), []);
  assert.deepEqual(validateMarkdownGovernancePolicy(policy), []);
  assert.deepEqual(validateMarkdownGovernanceHookConfig(hookConfig), []);
  assert.deepEqual(validateMarkdownGovernanceHookScript(preHookScript), []);
  assert.deepEqual(validateMarkdownGovernanceHookScript(postHookScript), []);
  assert.deepEqual(await validateMarkdownGovernance(rootDirectory), []);

  assert.deepEqual(validateMarkdownGovernanceEntries([
    { relativePath: 'rules/bad.md', contents: 'This should fail.\nThis may fail.' },
    { relativePath: 'rules/long.md', contents: Array.from({ length: 151 }, () => 'x').join('\n') }
  ], contract).map(({ ruleId }) => ruleId), [
    'markdown.banned-modals',
    'markdown.banned-modals',
    'markdown.max-lines'
  ]);

  const invalidContract = structuredClone(contract);
  invalidContract.rules.find((rule) => rule.id === 'markdown.max-lines').maxLines = 151;
  assert.ok(validateMarkdownGovernanceContract(invalidContract).some((error) => error.includes('maxLines must be 150')));

  const preHookPath = path.join(rootDirectory, '.codex', 'hooks', 'pre-tool-use-markdown-governance.mjs');
  const postHookPath = path.join(rootDirectory, '.codex', 'hooks', 'post-tool-use-markdown-governance.mjs');
  const validPre = spawnSync(process.execPath, [preHookPath], {
    cwd: rootDirectory,
    input: JSON.stringify({ toolName: 'apply_patch', input: { patch: '*** Begin Patch\n*** Update File: rules/markdown-governance.md\n*** End Patch\n' } })
  });
  assert.equal(validPre.status, 0);

  const invalidContractPath = path.join(temporaryDirectory, 'invalid-contract.json');
  await fs.writeFile(invalidContractPath, JSON.stringify(invalidContract, null, 2));
  const invalidPre = spawnSync(process.execPath, [preHookPath], {
    cwd: rootDirectory,
    env: { ...process.env, MARKDOWN_GOVERNANCE_CONTRACT_PATH: invalidContractPath },
    input: JSON.stringify({ toolName: 'apply_patch', input: { patch: '*** Begin Patch\n*** Update File: rules/markdown-governance.md\n*** End Patch\n' } })
  });
  assert.equal(invalidPre.status, 1);
  assert.match(invalidPre.stderr.toString(), /Markdown governance PreToolUse hook detected an invalid contract; enter repair mode/);

  const reportPath = path.join(temporaryDirectory, 'markdown-report.jsonl');
  const validPost = spawnSync(process.execPath, [postHookPath], {
    cwd: rootDirectory,
    env: { ...process.env, MARKDOWN_GOVERNANCE_REPORT_PATH: reportPath },
    input: JSON.stringify({ toolName: 'apply_patch', input: { patch: '*** Begin Patch\n*** Update File: rules/markdown-governance.md\n*** End Patch\n' } })
  });
  assert.equal(validPost.status, 0);
  const reportEntries = (await fs.readFile(reportPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(reportEntries[0].event, 'PostToolUse');
  assert.equal(reportEntries[0].file, 'rules/markdown-governance.md');
  assert.equal(reportEntries[0].ruleId, 'markdown.governance');
  assert.equal(reportEntries[0].repairRequired, false);

  const brokenConfig = structuredClone(hookConfig);
  brokenConfig.hooks.PostToolUse
    .find((entry) => entry.matcher === '^(apply_patch|Edit|Write)$')
    .hooks = [];
  assert.ok(validateMarkdownGovernanceHookConfig(brokenConfig).some((error) =>
    error.includes('post-tool-use-markdown-governance.mjs')
  ));
});

test('validates deterministic resource budget policy and skill', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const policy = await fs.readFile(path.join(rootDirectory, 'rules', 'resource-budgets.md'), 'utf8');
  const skill = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'resource-budget-gate', 'SKILL.md'),
    'utf8'
  );
  const metadata = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'resource-budget-gate', 'agents', 'openai.yaml'),
    'utf8'
  );

  assert.deepEqual(validateResourceBudgetPolicy(policy), []);
  assert.deepEqual(validateResourceBudgetGateSkill(skill, metadata), []);
  assert.deepEqual(await validateResourceBudgets(rootDirectory), []);
  assert.ok(validateResourceBudgetPolicy(policy.replaceAll('Budget Envelope', 'Budget Note')).some((error) =>
    error.includes('Budget Envelope')
  ));
  assert.ok(validateResourceBudgetGateSkill(
    skill.replace('Runtime Budget Loop', 'Runtime Review'),
    metadata.replace('allow_implicit_invocation: false', 'allow_implicit_invocation: true')
  ).length >= 2);
});

test('keeps scoped governance content out of the agent bootstrap guide and personal notes', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const guide = await fs.readFile(path.join(rootDirectory, 'AGENTS.md'), 'utf8');

  assert.deepEqual(validateDocumentationScope(guide), []);
  await assert.rejects(fs.access(path.join(rootDirectory, 'NOTES.md')));
  assert.ok(validateDocumentationScope(`${guide}\n## Implementation Constraints\n`).some((error) =>
    error.includes('Implementation Constraints')
  ));
  assert.ok(validateDocumentationScope(`${guide}\n## Commands\n`).some((error) =>
    error.includes('Commands')
  ));
});

test('enforces Markdown files at or below 150 lines', () => {
  assert.deepEqual(validateMarkdownLineBudgets([
    { relativePath: 'short.md', contents: Array.from({ length: 150 }, () => 'x').join('\n') },
    { relativePath: 'long.md', contents: Array.from({ length: 151 }, () => 'x').join('\n') }
  ]), ['long.md: Markdown files must stay at or below 150 lines; found 151']);
});

test('validates deterministic orchestration and quality gate skills', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  const orchestrateSkill = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'orchestrate-request', 'SKILL.md'),
    'utf8'
  );
  const orchestrateMetadata = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'orchestrate-request', 'agents', 'openai.yaml'),
    'utf8'
  );
  const qualitySkill = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'quality-gate', 'SKILL.md'),
    'utf8'
  );
  const qualityMetadata = await fs.readFile(
    path.join(rootDirectory, '.agents', 'skills', 'quality-gate', 'agents', 'openai.yaml'),
    'utf8'
  );

  assert.deepEqual(validateOrchestrateRequestSkill(orchestrateSkill, orchestrateMetadata), []);
  assert.deepEqual(validateQualityGateSkill(qualitySkill, qualityMetadata), []);
  assert.ok(validateOrchestrateRequestSkill(
    orchestrateSkill.replace('Verification Matrix', 'Checks'),
    orchestrateMetadata
  ).some((error) => error.includes('Verification Matrix')));
  assert.ok(validateQualityGateSkill(
    qualitySkill.replace('Repair Loop', 'Fix Loop'),
    qualityMetadata
  ).some((error) => error.includes('Repair Loop')));
});

test('agent roles reference the deterministic workflow contract', async () => {
  const rootDirectory = path.resolve(import.meta.dirname, '..');
  for (const agentName of ['planner', 'implementer', 'senior-implementer', 'reviewer', 'verifier']) {
    const fileName = `${agentName}.toml`;
    const contents = await fs.readFile(path.join(rootDirectory, '.codex', 'agents', fileName), 'utf8');
    assert.deepEqual(validateAgentDocument(fileName, contents), []);
    assert.match(contents, /ADR-0033/);
  }
});

test('supports Node.js 22 and later while retaining the Node.js 22 baseline', async () => {
  const packageManifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lockfile = JSON.parse(await fs.readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const baseline = (await fs.readFile(new URL('../.nvmrc', import.meta.url), 'utf8')).trim();

  assert.equal(packageManifest.engines.node, '>=22');
  assert.equal(lockfile.packages[''].engines.node, '>=22');
  assert.equal(baseline, '22');
});

test('uses the public @easy-mark/cli package metadata and ESM workflow scripts', async () => {
  const packageManifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lockfile = JSON.parse(await fs.readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

  assert.equal(packageManifest.name, '@easy-mark/cli');
  assert.equal(lockfile.name, '@easy-mark/cli');
  assert.equal(lockfile.packages[''].name, '@easy-mark/cli');
  assert.equal(packageManifest.private, false);
  assert.deepEqual(packageManifest.bin, { 'easy-mark': 'bin/easy-mark.mjs' });
  assert.deepEqual(lockfile.packages[''].bin, { 'easy-mark': 'bin/easy-mark.mjs' });
  assert.equal(packageManifest.license, 'MIT');
  assert.equal(packageManifest.repository?.url, 'git+https://github.com/luca-leone/easy-mark.git');
  assert.equal(packageManifest.bugs?.url, 'https://github.com/luca-leone/easy-mark/issues');
  assert.equal(packageManifest.homepage, 'https://github.com/luca-leone/easy-mark#readme');
  assert.deepEqual(packageManifest.publishConfig, { access: 'public' });
  assert.equal(packageManifest.scripts['task:commit'], 'node script/git/auto-task-commit.mjs');
  assert.equal(packageManifest.scripts['validate:agentic-workflow'], 'node script/validate-agentic-workflow.mjs');
  assert.equal(packageManifest.scripts['validate:agentic-paths'], 'node script/validate-agentic-paths.mjs');
  assert.equal(packageManifest.scripts['validate:agentic-runtime-contract'], 'node script/validate-agentic-lean-path-runtime.mjs');
  assert.equal(packageManifest.scripts['report:agentic-compliance'], 'node script/report-agentic-compliance.mjs');
  assert.equal(packageManifest.scripts['validate:resource-budgets'], 'node script/validate-resource-budgets.mjs');
  assert.equal(packageManifest.scripts['validate:markdown-governance'], 'node script/validate-markdown-governance.mjs');
  assert.equal(packageManifest.scripts['repair:markdown-governance'], 'node script/repair-markdown-governance.mjs');
  assert.deepEqual(packageManifest.dependencies, lockfile.packages[''].dependencies);
  for (const dependencyName of [
    'chart.js',
    'chokidar',
    'express',
    'github-slugger',
    'mem-fs',
    'mem-fs-editor',
    'mermaid',
    'mime-types',
    'rehype-raw',
    'rehype-sanitize',
    'rehype-stringify',
    'remark-gfm',
    'remark-parse',
    'remark-rehype',
    'unified',
    'unist-util-visit'
  ]) {
    assert.equal(typeof packageManifest.dependencies[dependencyName], 'string');
  }
  assert.equal(Object.hasOwn(packageManifest.scripts, 'start'), false);
  assert.ok(packageManifest.files.includes('bin/'));
  assert.ok(packageManifest.files.includes('core/server/'));
  assert.ok(packageManifest.files.includes('core/web/'));
  assert.equal(packageManifest.files.includes('demo/'), false);
  await assert.rejects(fs.access(new URL('../server.js', import.meta.url)));
  await assert.rejects(fs.access(new URL('../core/server/server.js', import.meta.url)));
  assert.deepEqual(validateWorkflowScriptPaths([
    'script/valid.mjs',
    'script/invalid.js',
    'script/nested/invalid.py',
    'script/nested/invalid.cjs',
    'script/tool.sh',
    'script/tool.ts',
    'script/no-extension'
  ]), [
    'script/invalid.js: workflow and maintenance scripts must use ESM .mjs',
    'script/nested/invalid.cjs: workflow and maintenance scripts must use ESM .mjs',
    'script/nested/invalid.py: workflow and maintenance scripts must use ESM .mjs',
    'script/no-extension: workflow and maintenance scripts must use ESM .mjs',
    'script/tool.sh: workflow and maintenance scripts must use ESM .mjs',
    'script/tool.ts: workflow and maintenance scripts must use ESM .mjs'
  ]);
});

test('uses total code-unit ordering and rejects unexpected agent entries', () => {
  const composed = 'é';
  const decomposed = 'e\u0301';
  assert.notEqual(compareCodeUnits(composed, decomposed), 0);
  assert.deepEqual(
    [composed, decomposed].sort(compareCodeUnits),
    [decomposed, composed]
  );
  assert.deepEqual(validateAgentEntries(['planner.toml', 'skill', 'extra.toml']), [
    '.codex/agents/extra.toml: unexpected agent entry',
    '.codex/agents/skill: unexpected agent entry'
  ]);
});
