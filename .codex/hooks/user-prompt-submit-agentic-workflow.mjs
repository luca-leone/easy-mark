#!/usr/bin/env node
// Agentic workflow intake hook: starts the observable workflow ledger as soon as a user prompt is submitted.
import { readStdin } from '../../script/agentic-lean-path-runtime.mjs';
import { runWorkflowHook } from '../../script/agentic-workflow-runtime.mjs';

const errors = await runWorkflowHook('UserPromptSubmit', await readStdin());
if (errors.length > 0) {
  console.error('Agentic workflow intake hook failed; enter repair mode.');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
