#!/usr/bin/env node
import path from 'node:path';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  parseHookPayload,
  readJsonFile,
  readStdin,
  toolCallRequiresRuntimeContract,
  validateAgenticRuntimeContract
} from '../../script/agentic-runtime-contract.mjs';

const rawPayload = await readStdin();
const payload = parseHookPayload(rawPayload);
const requirement = toolCallRequiresRuntimeContract(payload, rawPayload);

if (!requirement.required) process.exit(0);

const root = await findRepositoryRoot(process.cwd());
const runtimeContractPath = process.env.AGENTIC_RUNTIME_CONTRACT_PATH ?? DEFAULT_RUNTIME_CONTRACT_PATH;

try {
  const [pathContract, runtimeContract] = await Promise.all([
    readJsonFile(path.join(root, 'rules', 'agentic-paths.json')),
    readJsonFile(path.resolve(root, runtimeContractPath))
  ]);
  const errors = validateAgenticRuntimeContract(runtimeContract, pathContract);
  if (errors.length === 0) process.exit(0);
  deny(`Agentic runtime contract is invalid before ${requirement.reason}.`, errors);
} catch (error) {
  deny(
    `Agentic runtime contract is required before ${requirement.reason}.`,
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

async function findRepositoryRoot(startDirectory) {
  let currentDirectory = path.resolve(startDirectory);
  while (true) {
    try {
      await readJsonFile(path.join(currentDirectory, 'rules', 'agentic-paths.json'));
      return currentDirectory;
    } catch {
      const parentDirectory = path.dirname(currentDirectory);
      if (parentDirectory === currentDirectory) return path.resolve(startDirectory);
      currentDirectory = parentDirectory;
    }
  }
}
