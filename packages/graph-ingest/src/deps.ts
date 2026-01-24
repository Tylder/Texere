import { exec } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export async function detectPackageManager(repoPath: string): Promise<PackageManager> {
  const lockfiles: Array<{ name: PackageManager; lockfile: string }> = [
    { name: 'pnpm', lockfile: 'pnpm-lock.yaml' },
    { name: 'yarn', lockfile: 'yarn.lock' },
    { name: 'npm', lockfile: 'package-lock.json' },
  ];

  for (const { name, lockfile } of lockfiles) {
    try {
      await stat(`${repoPath}/${lockfile}`);
      return name;
    } catch {
      // Continue to next lockfile.
    }
  }

  return 'npm';
}

export async function installDependencies(
  repoPath: string,
  packageManager: PackageManager,
): Promise<void> {
  let command = '';

  if (packageManager === 'pnpm') {
    command = 'pnpm install --frozen-lockfile';
  } else if (packageManager === 'yarn') {
    command = 'yarn install --frozen-lockfile';
  } else {
    const hasLockfile = await hasPackageLock(repoPath);
    command = hasLockfile ? 'npm ci' : 'npm install';
  }

  try {
    await execAsync(command, { cwd: repoPath, timeout: 300000 });
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    throw new Error(
      `Dependency install failed: ${err.message}\nstderr: ${err.stderr ?? ''}\nstdout: ${err.stdout ?? ''}`,
    );
  }
}

async function hasPackageLock(repoPath: string): Promise<boolean> {
  try {
    await stat(`${repoPath}/package-lock.json`);
    return true;
  } catch {
    return false;
  }
}
