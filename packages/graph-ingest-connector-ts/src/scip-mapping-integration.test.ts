import { exec } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { FileNode } from '@repo/graph-core';
import { InMemoryGraphStore, InMemoryRelationalStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

const execAsync = promisify(exec);

async function createMinimalTsProject(repoRoot: string): Promise<{ cleanup: () => Promise<void> }> {
  await writeFile(
    path.join(repoRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'test-repo',
        version: '1.0.0',
        type: 'module',
        devDependencies: {
          typescript: '^5.0.0',
        },
      },
      null,
      2,
    ),
    'utf-8',
  );

  await writeFile(
    path.join(repoRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          outDir: 'dist',
        },
        include: ['src/**/*'],
      },
      null,
      2,
    ),
    'utf-8',
  );

  await mkdir(path.join(repoRoot, 'src'), { recursive: true });
  await writeFile(
    path.join(repoRoot, 'src', 'index.ts'),
    `// Test file for SCIP indexing
export interface User {
  id: string;
  name: string;
}

export function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}

export const VERSION = '1.0.0';
`,
    'utf-8',
  );

  await execAsync('npm install', { cwd: repoRoot, timeout: 120000 });

  return {
    cleanup: async () => {
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

const runIntegration = process.env['RUN_INTEGRATION'] === 'true';
const describeIf = runIntegration ? describe : describe.skip;

describeIf(
  'SCIP-TS mapping integration (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)',
  () => {
    it('creates file and symbol nodes from actual SCIP index', async () => {
      const repoRoot = path.join(tmpdir(), `graph-scip-test-${Date.now()}`);
      await mkdir(repoRoot, { recursive: true });

      const { cleanup } = await createMinimalTsProject(repoRoot);

      try {
        const connector = new ScipTsIngestionConnector();
        const store = {
          graph: new InMemoryGraphStore(),
          relational: new InMemoryRelationalStore(),
        };

        await connector.ingest(
          {
            repoPath: repoRoot,
            repoUrl: 'https://example.com/test-repo',
            source_ref: 'https://example.com/test-repo',
            policy_ref: 'default-policy',
            snapshot_id: 'test-commit-hash',
            run_id: 'run-1',
          },
          store,
        );

        const files = store.graph
          .listNodes()
          .filter((node): node is FileNode => node.kind === 'File');

        const indexFile = files.find((file) => file.path === 'src/index.ts');
        expect(indexFile).toBeDefined();
        expect(indexFile?.locator?.path_or_url).toBe('src/index.ts');
      } finally {
        await cleanup();
      }
    }, 180000);

    it('records toolchain provenance in run summary', async () => {
      const repoRoot = path.join(tmpdir(), `graph-scip-provenance-${Date.now()}`);
      await mkdir(repoRoot, { recursive: true });

      const { cleanup } = await createMinimalTsProject(repoRoot);

      try {
        const connector = new ScipTsIngestionConnector();
        const store = {
          graph: new InMemoryGraphStore(),
          relational: new InMemoryRelationalStore(),
        };

        const result = await connector.ingest(
          {
            repoPath: repoRoot,
            repoUrl: 'https://example.com/test-repo',
            source_ref: 'https://example.com/test-repo',
            policy_ref: 'default-policy',
            snapshot_id: 'provenance-test',
            run_id: 'run-1',
          },
          store,
        );

        const capability = result.capability_declarations[0];
        expect(capability?.capabilities?.['provenance']).toBeDefined();
      } finally {
        await cleanup();
      }
    }, 180000);
  },
);
