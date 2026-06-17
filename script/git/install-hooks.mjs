import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function runGit(argumentsList, options = {}) {
  return spawnSync('git', argumentsList, {
    cwd: options.cwd,
    encoding: 'utf8',
    windowsHide: true
  });
}

export function findRepositoryRoot(startDirectory = process.cwd(), gitRunner = runGit) {
  const result = gitRunner(['rev-parse', '--show-toplevel'], { cwd: startDirectory });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Not inside a Git working tree.');
  return path.resolve(result.stdout.trim());
}

export function installHooks(repositoryRoot, gitRunner = runGit) {
  const root = path.resolve(repositoryRoot);
  const repositoryHooksPath = 'hooks/git';
  const current = gitRunner(['config', '--get', 'core.hooksPath'], { cwd: root });
  if (current.status === 0) {
    const configuredPath = current.stdout.trim();
    if (configuredPath === repositoryHooksPath) {
      return { repositoryRoot: root, hooksPath: repositoryHooksPath, changed: false };
    }
    throw new Error(
      `Refusing to replace effective core.hooksPath=${configuredPath}. Remove or change it explicitly in the applicable Git configuration before installing repository hooks.`
    );
  }
  if (current.status !== 1) throw new Error(current.stderr.trim() || 'Unable to read effective core.hooksPath.');

  const result = gitRunner(['config', '--local', 'core.hooksPath', repositoryHooksPath], { cwd: root });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to configure core.hooksPath.');
  const effective = gitRunner(['config', '--get', 'core.hooksPath'], { cwd: root });
  if (effective.status !== 0 || effective.stdout.trim() !== repositoryHooksPath) {
    throw new Error('Configured local core.hooksPath=hooks/git, but another applicable Git setting still takes precedence.');
  }
  return { repositoryRoot: root, hooksPath: repositoryHooksPath, changed: true };
}

export function runCli(startDirectory = process.cwd()) {
  const repositoryRoot = findRepositoryRoot(startDirectory);
  const result = installHooks(repositoryRoot);
  const action = result.changed ? 'Configured' : 'Already configured';
  console.log(`${action} core.hooksPath=${result.hooksPath} for ${result.repositoryRoot}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
