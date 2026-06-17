#!/usr/bin/env node
// Agentic lean path preflight hook: detects missing or invalid JSON runtime contracts and triggers repair mode.
import path from 'node:path';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  findRepositoryRoot,
  parseHookPayload,
  readJsonFile,
  readStdin,
  toolCallRequiresRuntimeContract,
  validateAgenticRuntimeContract
} from '../../script/agentic-lean-path-runtime.mjs';

const rawPayload = await readStdin();
const payload = parseHookPayload(rawPayload);
const requirement = toolCallRequiresRuntimeContract(payload, rawPayload);

if (!requirement.required) process.exit(0);

const root = await findRepositoryRoot(process.cwd());
const runtimeContractPath = process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH;

try {
  const [pathContract, runtimeContract] = await Promise.all([
    readJsonFile(path.join(root, 'contracts', 'governance', 'agentic-paths.json')),
    readJsonFile(path.resolve(root, runtimeContractPath))
  ]);
  const errors = validateAgenticRuntimeContract(runtimeContract, pathContract);
  if (errors.length === 0) process.exit(0);
  deny(`Agentic lean path violation detected before ${requirement.reason}; enter repair mode.`, errors);
} catch (error) {
  deny(
    `Agentic lean path runtime contract is missing before ${requirement.reason}; enter repair mode.`,
    [
      `Expected ${runtimeContractPath}.`,
      error instanceof SyntaxError ? 'Runtime contract JSON is malformed.' : 'Runtime contract file is missing or unreadable.'
    ]
  );
}

function deny(message, details) {
  console.error(message);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}
