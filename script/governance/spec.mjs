export const REQUIRED_FILES = Object.freeze([
  'AGENTS.md',
  'contracts/governance/agentic-paths.json',
  'contracts/governance/agentic-workflow-events.json',
  'contracts/governance/versioning.json',
  'rules/agentic-workflow.md',
  'rules/command-reference.md',
  'contracts/governance/markdown-governance.json',
  'rules/markdown-governance.md',
  'rules/project-rules.md',
  'rules/release-process.md',
  'rules/resource-budgets.md',
  'rules/workspace-layout.md',
  'contracts/application-contract.md',
  'guardrails/non-negotiables.md',
  'evaluation/acceptance-checklist.md',
  'reports/README.md',
  'memory/decisions.md',
  'doc/adr/README.md',
  '.codex/config.toml',
  '.codex/hooks.json',
  '.codex/agents/planner.toml',
  '.codex/agents/implementer.toml',
  '.codex/agents/senior-implementer.toml',
  '.codex/agents/verifier.toml',
  '.codex/agents/reviewer.toml',
  '.agents/skills/auto-commit/SKILL.md',
  '.agents/skills/auto-commit/agents/openai.yaml',
  '.agents/skills/context-budget-monitor/SKILL.md',
  '.agents/skills/context-budget-monitor/agents/openai.yaml',
  '.agents/skills/generate-commit/SKILL.md',
  '.agents/skills/generate-commit/agents/openai.yaml',
  '.agents/skills/orchestrate-request/SKILL.md',
  '.agents/skills/orchestrate-request/agents/openai.yaml',
  '.agents/skills/quality-gate/SKILL.md',
  '.agents/skills/quality-gate/agents/openai.yaml',
  '.agents/skills/resource-budget-gate/SKILL.md',
  '.agents/skills/resource-budget-gate/agents/openai.yaml',
  '.codex/hooks/pre-tool-use-agentic-lean-path.mjs',
  '.codex/hooks/pre-tool-use-agentic-workflow.mjs',
  '.codex/hooks/post-tool-use-agentic-lean-path.mjs',
  '.codex/hooks/user-prompt-submit-agentic-workflow.mjs',
  '.codex/hooks/subagent-start-agentic-workflow.mjs',
  '.codex/hooks/subagent-stop-agentic-workflow.mjs',
  '.codex/hooks/stop-agentic-workflow.mjs',
  '.codex/hooks/pre-tool-use-markdown-governance.mjs',
  '.codex/hooks/post-tool-use-markdown-governance.mjs',
  'hooks/git/commit-msg',
  'script/validate-agentic-workflow.mjs',
  'script/validate-agentic-paths.mjs',
  'script/validate-agentic-lean-path-runtime.mjs',
  'script/agentic-lean-path-runtime.mjs',
  'script/agentic-workflow-runtime.mjs',
  'script/versioning-runtime.mjs',
  'script/validate-markdown-governance.mjs',
  'script/repair-markdown-governance.mjs',
  'script/markdown-governance-runtime.mjs',
  'script/report-agentic-compliance.mjs',
  'script/validate-resource-budgets.mjs',
  'script/git/auto-task-commit.mjs',
  'script/git/validate-commit-message.mjs',
  'script/git/install-hooks.mjs'
]);

export const REQUIRED_ADR_SECTIONS = Object.freeze([
  '## Status',
  '## Context',
  '## Decision',
  '## Consequences',
  '## Alternatives Considered'
]);

export const AGENT_SPECIFICATIONS = Object.freeze({
  planner: { model: 'gpt-5.5', effort: 'high', sandbox: 'read-only' },
  implementer: { model: 'gpt-5.4-mini', effort: 'medium', sandbox: 'workspace-write' },
  'senior-implementer': { model: 'gpt-5.5', effort: 'high', sandbox: 'workspace-write' },
  verifier: { model: 'gpt-5.4-mini', effort: 'low', sandbox: 'read-only' },
  reviewer: { model: 'gpt-5.5', effort: 'high', sandbox: 'read-only' }
});

export const GOVERNANCE_MARKDOWN_DIRECTORIES = Object.freeze([
  'rules',
  'contracts',
  'guardrails',
  'evaluation',
  'reports',
  'memory',
  'doc',
  '.agents'
]);

export const EXPECTED_AGENT_FILES = Object.freeze(
  Object.keys(AGENT_SPECIFICATIONS).map((name) => `${name}.toml`).sort()
);
