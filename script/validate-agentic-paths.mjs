import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateAgenticPathContract } from './governance/validators.mjs';

export async function validateAgenticPaths(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];
  try {
    const contract = JSON.parse(await fs.readFile(path.join(root, 'contracts', 'governance', 'agentic-paths.json'), 'utf8'));
    errors.push(...validateAgenticPathContract(contract));
  } catch (error) {
    if (error instanceof SyntaxError) {
      errors.push('contracts/governance/agentic-paths.json: invalid JSON');
    } else {
      errors.push('contracts/governance/agentic-paths.json: required for deterministic path validation');
    }
  }
  return errors.sort();
}

async function runCli() {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = await validateAgenticPaths(rootDirectory);
  if (errors.length > 0) {
    console.error('Agentic path validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Agentic path validation passed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
