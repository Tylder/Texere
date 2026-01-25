import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '..', 'fixtures');
const fixtureIndexPath = path.join(fixturesDir, 'index.scip');

async function generateFixture() {
  console.log('🔄 Generating SCIP fixture from sindresorhus/ky v1.14.2...\n');

  const tmpDir = path.join(tmpdir(), `ky-fixture-${Date.now()}`);

  try {
    console.log(`📦 Setting up directories...`);
    await mkdir(fixturesDir, { recursive: true });

    console.log(`🔗 Cloning sindresorhus/ky v1.14.2 (commit 51b0129)...`);

    // Clone ky repo at the specific commit
    execSync(
      `git clone --depth 1 --branch v1.14.2 https://github.com/sindresorhus/ky "${tmpDir}"`,
      { stdio: 'pipe' },
    );

    // Verify we have the right commit
    const commit = execSync(`git rev-parse HEAD`, { cwd: tmpDir, encoding: 'utf-8' }).trim();
    if (!commit.startsWith('51b0129')) {
      throw new Error(
        `Expected commit 51b0129..., got ${commit}. Clone may have failed.`,
      );
    }
    console.log(`✓ Cloned at commit ${commit.substring(0, 7)}`);

    console.log(`\n📥 Installing dependencies...`);
    execSync(`npm install --silent --no-fund --no-audit`, {
      cwd: tmpDir,
      stdio: 'pipe',
    });
    console.log(`✓ Dependencies installed`);

    console.log(`\n🔍 Running scip-typescript index...`);
    execSync(`npx @sourcegraph/scip-typescript index`, {
      cwd: tmpDir,
      timeout: 300000,
      stdio: 'pipe',
    });
    console.log(`✓ SCIP index generated`);

    // Copy the index.scip to fixtures
    const scipContent = await readFile(path.join(tmpDir, 'index.scip'));
    await writeFile(fixtureIndexPath, scipContent);

    console.log(`\n✅ Fixture written to ${fixtureIndexPath} (${scipContent.length} bytes)`);
  } finally {
    // Cleanup
    execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' });
  }
}

generateFixture().catch((err) => {
  console.error('❌ Failed to generate fixture:', err.message);
  process.exit(1);
});
