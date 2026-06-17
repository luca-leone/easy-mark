#!/usr/bin/env node
// Agentic workflow preflight hook: blocks governed tool use until intake and required agent routing events exist.
import { readStdin } from '../../script/agentic-lean-path-runtime.mjs';
import { runWorkflowHook } from '../../script/agentic-workflow-runtime.mjs';

const errors = await runWorkflowHook('PreToolUse', await readStdin());
if (errors.length > 0) {
  console.error('Agentic workflow PreToolUse gate detected a workflow violation; enter repair mode.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(0);
}
