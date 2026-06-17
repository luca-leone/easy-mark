#!/usr/bin/env node
// Agentic workflow subagent start hook: records required planner, implementer, reviewer, and verifier routing events.
import { readStdin } from '../../script/agentic-lean-path-runtime.mjs';
import { runWorkflowHook } from '../../script/agentic-workflow-runtime.mjs';

const errors = await runWorkflowHook('SubagentStart', await readStdin());
if (errors.length > 0) {
  console.error('Agentic workflow SubagentStart hook failed; enter repair mode.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
