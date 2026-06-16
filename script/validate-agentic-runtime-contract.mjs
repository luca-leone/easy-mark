import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  readJsonFile,
  validateAgenticRuntimeContract
} from './agentic-runtime-contract.mjs';

export async function validateAgenticRuntimeContractFile(rootDirectory, runtimeContractPath = DEFAULT_RUNTIME_CONTRACT_PATH) {
  const root = path.resolve(rootDirectory);
  const errors = [];
  try {
    const [pathContract, runtimeContract] = await Promise.all([
      readJsonFile(path.join(root, 'rules', 'agentic-paths.json')),
      readJsonFile(path.resolve(root, runtimeContractPath))
    ]);
    errors.push(...validateAgenticRuntimeContract(runtimeContract, pathContract));
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push(`${runtimeContractPath}: invalid JSON`);
    } else {
      errors.push(`${runtimeContractPath}: required runtime contract is unreadable`);
    }
  }
  return errors.sort();
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const runtimeContractPath = process.argv[2] ?? DEFAULT_RUNTIME_CONTRACT_PATH;
  const errors = await validateAgenticRuntimeContractFile(rootDirectory, runtimeContractPath);
  if (errors.length > 0) {
    console.error('Agentic runtime contract validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Agentic runtime contract validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
