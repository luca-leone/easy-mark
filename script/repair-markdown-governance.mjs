import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  formatMarkdownGovernanceViolation,
  readMarkdownGovernanceContract,
  repairMarkdownGovernanceFiles,
  validateMarkdownGovernanceContract,
  validateMarkdownGovernanceFiles
} from './markdown-governance-runtime.mjs';

export async function repairMarkdownGovernance(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const contract = await readMarkdownGovernanceContract(root);
  const contractErrors = validateMarkdownGovernanceContract(contract);
  if (contractErrors.length > 0) return { changed: [], errors: contractErrors };
  const changed = await repairMarkdownGovernanceFiles(root, contract);
  const errors = (await validateMarkdownGovernanceFiles(root, contract)).map(formatMarkdownGovernanceViolation);
  return { changed, errors };
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { changed, errors } = await repairMarkdownGovernance(rootDirectory);
  for (const relativePath of changed) console.log(`Repaired ${relativePath}`);
  if (errors.length > 0) {
    console.error('Markdown governance repair requires explicit text edits:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Markdown governance repair completed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
