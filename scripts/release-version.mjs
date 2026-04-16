import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const packages = [
  {
    name: '@texere/graph',
    packageJsonPath: path.join(repoRoot, 'packages/graph/package.json'),
  },
  {
    name: '@texere/mcp',
    packageJsonPath: path.join(repoRoot, 'apps/mcp/package.json'),
  },
];

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/u;

function readPackageVersion(packageJsonPath) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function getReleaseState() {
  const versions = packages.map((pkg) => ({
    ...pkg,
    version: readPackageVersion(pkg.packageJsonPath),
  }));

  for (const pkg of versions) {
    if (!semverPattern.test(pkg.version)) {
      throw new Error(
        `${pkg.name} has invalid version \`${pkg.version}\` in ${path.relative(repoRoot, pkg.packageJsonPath)}`,
      );
    }
  }

  const uniqueVersions = [...new Set(versions.map((pkg) => pkg.version))];

  if (uniqueVersions.length !== 1) {
    const details = versions.map((pkg) => `${pkg.name}=${pkg.version}`).join(', ');
    throw new Error(`Publishable package versions must match. Found: ${details}`);
  }

  const version = uniqueVersions[0];

  return {
    version,
    expectedTag: `v${version}`,
    packages: versions,
  };
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function ensureTagMatchesReleaseVersion(state) {
  const currentTag = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG;

  if (!currentTag) {
    return;
  }

  if (currentTag !== state.expectedTag) {
    throw new Error(
      `Release tag mismatch: expected ${state.expectedTag} from package versions, received ${currentTag}`,
    );
  }
}

function ensureCleanWorkingTree() {
  const status = git('status', '--porcelain');

  if (status.length > 0) {
    throw new Error('Working tree must be clean before creating a release tag.');
  }
}

function ensureTagDoesNotExist(tag) {
  const existing = git('tag', '--list', tag);

  if (existing === tag) {
    throw new Error(`Tag ${tag} already exists.`);
  }
}

function createTag(state, push) {
  ensureCleanWorkingTree();
  ensureTagDoesNotExist(state.expectedTag);

  execFileSync('git', ['tag', '-a', state.expectedTag, '-m', `Release ${state.expectedTag}`], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (push) {
    execFileSync('git', ['push', 'origin', state.expectedTag], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  }
}

function main() {
  const [command = 'check', ...args] = process.argv.slice(2);
  const push = args.includes('--push');
  const state = getReleaseState();

  switch (command) {
    case 'check': {
      ensureTagMatchesReleaseVersion(state);
      console.log(`Release version OK: ${state.version} (${state.expectedTag})`);
      return;
    }
    case 'print-tag': {
      console.log(state.expectedTag);
      return;
    }
    case 'create-tag': {
      createTag(state, push);
      return;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
