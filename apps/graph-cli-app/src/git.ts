import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd });
  return stdout.trim();
}

export async function cloneRepo(source: string, destination: string): Promise<void> {
  await execAsync(`git clone ${source} ${destination}`);
}

export async function fetchRepo(cwd: string): Promise<void> {
  await execAsync('git fetch --all --prune', { cwd });
}

export async function checkoutRef(cwd: string, ref: string): Promise<void> {
  await execAsync(`git checkout ${ref}`, { cwd });
}
