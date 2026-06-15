import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  compareCodeUnits,
  validateAdrDocument,
  validateAgentDocument,
  validateAgentEntries,
  validateCodexConfig,
  validateContextBudgetSkill,
  validateDecisionMemory,
  validateGenerateCommitSkill,
  validateGovernance,
  validateInternalLinks,
  validateWorkflowScriptPaths
} from '../script/validate-governance.mjs';

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
Inspect and plan without editing.
"""
`;

  assert.deepEqual(validateAgentDocument('planner.toml', planner), []);
  assert.ok(validateAgentDocument('planner.toml', planner.replace('read-only', 'workspace-write'))
    .some((error) => error.includes('sandbox_mode')));
  assert.ok(validateAgentDocument('planner.toml', planner.replace('gpt-5.5', 'gpt-5.4-mini'))
    .some((error) => error.includes('model must be')));
});

test('supports Node.js 22 and later while retaining the Node.js 22 baseline', async () => {
  const packageManifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lockfile = JSON.parse(await fs.readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const baseline = (await fs.readFile(new URL('../.nvmrc', import.meta.url), 'utf8')).trim();

  assert.equal(packageManifest.engines.node, '>=22');
  assert.equal(lockfile.packages[''].engines.node, '>=22');
  assert.equal(baseline, '22');
});

test('uses the easy-mark package name and ESM workflow scripts', async () => {
  const packageManifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const lockfile = JSON.parse(await fs.readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

  assert.equal(packageManifest.name, 'easy-mark');
  assert.equal(lockfile.name, 'easy-mark');
  assert.equal(lockfile.packages[''].name, 'easy-mark');
  assert.equal(packageManifest.private, false);
  assert.deepEqual(packageManifest.bin, { 'easy-mark': './bin/easy-mark.mjs' });
  assert.deepEqual(lockfile.packages[''].bin, { 'easy-mark': 'bin/easy-mark.mjs' });
  assert.equal(packageManifest.scripts.start, 'node bin/easy-mark.mjs serve ./src');
  assert.ok(packageManifest.files.includes('bin/'));
  assert.ok(packageManifest.files.includes('core/server/'));
  assert.ok(packageManifest.files.includes('core/web/'));
  await assert.rejects(fs.access(new URL('../server.js', import.meta.url)));
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
