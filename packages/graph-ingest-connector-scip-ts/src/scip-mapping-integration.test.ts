import { exec } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import type { ArtifactPartNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { ScipTsIngestionConnector } from './index.js';

const execAsync = promisify(exec);

/**
 * Creates a minimal TypeScript project structure for SCIP indexing.
 */
async function createMinimalTsProject(repoRoot: string): Promise<{ cleanup: () => Promise<void> }> {
  // Create package.json
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

  // Create tsconfig.json
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

  // Create src directory and a TypeScript file
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

  // Install dependencies (needed for scip-typescript to work)
  await execAsync('npm install', { cwd: repoRoot, timeout: 120000 });

  return {
    cleanup: async () => {
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

describe('SCIP-TS mapping integration (SPEC-tooling-testing-trophy-strategy §2.2–§4.4, SPEC-tooling-testing-implementation-specification §3–§6)', () => {
  it('creates file and symbol parts from actual SCIP index', async () => {
    const repoRoot = path.join(tmpdir(), `graph-scip-test-${Date.now()}`);
    await mkdir(repoRoot, { recursive: true });

    const { cleanup } = await createMinimalTsProject(repoRoot);

    try {
      const connector = new ScipTsIngestionConnector();
      const store = new InMemoryGraphStore();

      await connector.ingest(
        {
          repoPath: repoRoot,
          repoUrl: 'https://example.com/test-repo',
          commit: 'test-commit-hash',
          projectId: 'project-1',
        },
        store,
      );

      const parts = store
        .listNodes()
        .filter((node): node is ArtifactPartNode => node.kind === 'ArtifactPart');

      // Should have at least one file part
      const fileParts = parts.filter((p) => p.part_kind === 'file');
      expect(fileParts.length).toBeGreaterThan(0);

      // Should have file part for src/index.ts
      const indexFilePart = fileParts.find((p) => p.locator === 'src/index.ts');
      expect(indexFilePart).toBeDefined();
      expect(indexFilePart?.retention_mode).toBe('link-only');

      // Should have symbol parts with proper SCIP locators (path#symbol format)
      const symbolParts = parts.filter((p) => p.part_kind === 'symbol');
      expect(symbolParts.length).toBeGreaterThan(0);

      // All symbol locators should follow the path#scip_symbol format
      for (const symbolPart of symbolParts) {
        expect(symbolPart.locator).toContain('#');
        expect(symbolPart.retention_mode).toBe('link-only');
      }

      // Check for expected symbols from our test file
      const locators = symbolParts.map((p) => p.locator);
      const hasUserSymbol = locators.some((l) => l.includes('User'));
      const hasGreetSymbol = locators.some((l) => l.includes('greet'));
      const hasVersionSymbol = locators.some((l) => l.includes('VERSION'));

      expect(hasUserSymbol || hasGreetSymbol || hasVersionSymbol).toBe(true);
    } finally {
      await cleanup();
    }
  }, 180000); // 3 minute timeout for npm install + scip indexing

  it('records toolchain provenance in state node', async () => {
    const repoRoot = path.join(tmpdir(), `graph-scip-provenance-${Date.now()}`);
    await mkdir(repoRoot, { recursive: true });

    const { cleanup } = await createMinimalTsProject(repoRoot);

    try {
      const connector = new ScipTsIngestionConnector();
      const store = new InMemoryGraphStore();

      await connector.ingest(
        {
          repoPath: repoRoot,
          repoUrl: 'https://example.com/test-repo',
          commit: 'provenance-test',
          projectId: 'project-1',
        },
        store,
      );

      const stateNode = store.listNodes().find((n) => n.kind === 'ArtifactState');
      expect(stateNode).toBeDefined();

      // State node should have provenance metadata
      const stateWithProvenance = stateNode as typeof stateNode & {
        provenance?: {
          nodeVersion: string;
          packageManager: string;
        };
      };

      expect(stateWithProvenance?.provenance).toBeDefined();
      expect(stateWithProvenance?.provenance?.nodeVersion).toMatch(/^v\d+/);
      expect(stateWithProvenance?.provenance?.packageManager).toBe('npm');
    } finally {
      await cleanup();
    }
  }, 180000);
});
