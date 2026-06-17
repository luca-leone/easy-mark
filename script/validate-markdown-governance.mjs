import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  formatMarkdownGovernanceViolation,
  readMarkdownGovernanceContract,
  validateMarkdownGovernanceContract,
  validateMarkdownGovernanceFiles
} from './markdown-governance-runtime.mjs';

export async function validateMarkdownGovernance(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];
  try {
    const contract = await readMarkdownGovernanceContract(root);
    errors.push(...validateMarkdownGovernanceContract(contract));
    if (errors.length === 0) {
      errors.push(...(await validateMarkdownGovernanceFiles(root, contract)).map(formatMarkdownGovernanceViolation));
    }
  } catch (error) {
    errors.push(error instanceof SyntaxError
      ? 'contracts/governance/markdown-governance.json: invalid JSON'
      : 'contracts/governance/markdown-governance.json: required for Markdown governance validation');
  }
  return errors.sort();
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = await validateMarkdownGovernance(rootDirectory);
  if (errors.length > 0) {
    console.error('Markdown governance validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Markdown governance validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
