#!/usr/bin/env node
// Agentic workflow subagent stop hook: records completed project-agent stages for deterministic routing gates.
import { readStdin } from '../../script/agentic-lean-path-runtime.mjs';
import { runWorkflowHook } from '../../script/agentic-workflow-runtime.mjs';

const errors = await runWorkflowHook('SubagentStop', await readStdin());
if (errors.length > 0) {
  console.error('Agentic workflow SubagentStop hook failed; enter repair mode.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
