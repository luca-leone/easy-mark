#!/usr/bin/env node
// Agentic workflow stop hook: verifies required agent routing before the workflow can complete cleanly.
import { readStdin } from '../../script/agentic-lean-path-runtime.mjs';
import { runWorkflowHook } from '../../script/agentic-workflow-runtime.mjs';

const errors = await runWorkflowHook('Stop', await readStdin());
if (errors.length > 0) {
  console.error('Agentic workflow Stop hook detected an incomplete workflow; enter repair mode.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(0);
}
