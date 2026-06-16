import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_RUNTIME_CONTRACT_PATH,
  buildComplianceReport,
  readJsonFile,
  validateAgenticRuntimeContract
} from './agentic-runtime-contract.mjs';

export async function buildAgenticComplianceReport(rootDirectory, runtimeContractPath = DEFAULT_RUNTIME_CONTRACT_PATH, options = {}) {
  const root = path.resolve(rootDirectory);
  const [pathContract, runtimeContract] = await Promise.all([
    readJsonFile(path.join(root, 'rules', 'agentic-paths.json')),
    readJsonFile(path.resolve(root, runtimeContractPath))
  ]);
  const violations = validateAgenticRuntimeContract(runtimeContract, pathContract);
  return buildComplianceReport(runtimeContract, {
    violations,
    hookEnforcement: options.hookEnforcement ?? 'PreToolUse configured',
    verification: options.verification ?? runtimeContract.verification
  });
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const runtimeContractPath = process.argv[2] ?? DEFAULT_RUNTIME_CONTRACT_PATH;
  const report = await buildAgenticComplianceReport(rootDirectory, runtimeContractPath);
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
