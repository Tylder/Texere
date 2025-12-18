/**
 * @file TypeScript Indexer Tests
 * @description Unit and integration tests for TS/JS symbol extraction, reference detection, boundaries, and test cases
 * @reference docs/specs/feature/indexer/testing_strategy_spec.md §2.2-2.3 (unit tests)
 * @reference docs/specs/feature/indexer/testing_specification.md §3 (test structure)
 * @reference docs/specs/feature/indexer/test_repository_spec.md (golden snapshots)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, it, expect } from 'vitest';

import { tsIndexer } from './ts-indexer.js';

describe('TypeScript Indexer (testing_specification §3)', () => {
  /**
   * Unit test: Symbol extraction
   * Tests: functions, classes, methods, interfaces, types, enums, consts
   * @reference ingest_spec.md §3 (SymbolIndex structure)
   * @reference test_repository_spec.md (symbol breakdown)
   */
  describe('Symbol Extraction (ingest_spec.md §3)', () => {
    it('should extract function symbols', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
export function greet(name: string): string {
  return \`Hello, \${name}\`;
}

function internal() {
  return 42;
}
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const symbols = results[0]!.symbols;
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'greet',
          kind: 'function',
          isExported: true,
        }),
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'internal',
          kind: 'function',
          isExported: false,
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });

    it('should extract class symbols and methods', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
export class User {
  constructor(private id: string, private name: string) {}

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }
}
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const symbols = results[0]!.symbols;

      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'User',
          kind: 'class',
          isExported: true,
        }),
      );

      // Methods extracted
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'getName',
          kind: 'method',
        }),
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'setName',
          kind: 'method',
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });

    it('should extract interface symbols', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
export interface IUser {
  id: string;
  name: string;
  email: string;
}
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const symbols = results[0]!.symbols;
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'IUser',
          kind: 'interface',
          isExported: true,
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });

    it('should extract type aliases', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
export type UserRole = 'admin' | 'user' | 'guest';

type ID = string;
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const symbols = results[0]!.symbols;
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'UserRole',
          kind: 'type',
          isExported: true,
        }),
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'ID',
          kind: 'type',
          isExported: false,
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });

    it('should extract const declarations', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
export const MAX_USERS = 100;

const DEFAULT_TIMEOUT = 5000;
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const symbols = results[0]!.symbols;
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'MAX_USERS',
          kind: 'const',
          isExported: true,
        }),
      );
      expect(symbols).toContainEqual(
        expect.objectContaining({
          name: 'DEFAULT_TIMEOUT',
          kind: 'const',
          isExported: false,
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });
  });

  /**
   * Unit test: Call extraction
   * Tests: function calls, method calls, call location tracking
   * @reference ingest_spec.md §4 (CallIndex structure)
   */
  describe('Call Extraction (ingest_spec.md §4)', () => {
    it('should extract function calls', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.ts');
      const code = `
function greet(name: string): string {
  return \`Hello, \${name}\`;
}

function main() {
  const msg = greet('World');
  return msg;
}
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.ts'],
      });

      expect(results).toHaveLength(1);
      const calls = results[0]!.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls).toContainEqual(
        expect.objectContaining({
          callerSymbolId: expect.stringContaining('main'),
          calleeSymbolId: expect.stringContaining('greet'),
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });
  });

  /**
   * Unit test: HTTP Boundary detection
   * Tests: Express route patterns (GET, POST, DELETE, etc.)
   * @reference ingest_spec.md §5.1 (boundary detection)
   * @reference language_indexers_spec.md §3.1 (Express heuristics)
   */
  describe('Boundary Detection (ingest_spec.md §5.1)', () => {
    it('should detect Express GET routes', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'routes.ts');
      const code = `
import express from 'express';

const app = express();

function handleGetUser() {
  return { id: '1' };
}

app.get('/users/:id', handleGetUser);
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['routes.ts'],
      });

      expect(results).toHaveLength(1);
      const boundaries = results[0]!.boundaries || [];
      expect(boundaries).toContainEqual(
        expect.objectContaining({
          verb: 'GET',
          path: '/users/:id',
          kind: 'http',
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });

    it('should detect Express POST/DELETE routes', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'routes.ts');
      const code = `
import express from 'express';

const app = express();
const router = express.Router();

function handleCreateUser() {
  return { id: '1' };
}

function handleDeleteUser() {
  return {};
}

app.post('/users', handleCreateUser);
router.delete('/users/:id', handleDeleteUser);
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['routes.ts'],
      });

      expect(results).toHaveLength(1);
      const boundaries = results[0]!.boundaries || [];

      expect(boundaries).toContainEqual(
        expect.objectContaining({
          verb: 'POST',
          path: '/users',
        }),
      );
      expect(boundaries).toContainEqual(
        expect.objectContaining({
          verb: 'DELETE',
          path: '/users/:id',
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });
  });

  /**
   * Unit test: Test case detection
   * Tests: vitest/jest describe, it, test patterns
   * @reference ingest_spec.md §5.1 (test detection)
   * @reference test_repository_spec.md (TestCase expectations)
   */
  describe('Test Detection (ingest_spec.md §5.1)', () => {
    it('should detect vitest/jest test cases', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'test.test.ts');
      const code = `
import { describe, it, expect } from 'vitest';

describe('User Service', () => {
  it('should create a user', () => {
    expect(true).toBe(true);
  });

  it('should delete a user', () => {
    expect(true).toBe(true);
  });

  describe('nested', () => {
    it('should handle nested tests', () => {
      expect(true).toBe(true);
    });
  });
});
      `;

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['test.test.ts'],
      });

      expect(results).toHaveLength(1);
      const testCases = results[0]!.testCases || [];

      expect(testCases).toContainEqual(
        expect.objectContaining({
          name: 'User Service',
        }),
      );
      expect(testCases).toContainEqual(
        expect.objectContaining({
          name: 'User Service > should create a user',
        }),
      );
      expect(testCases).toContainEqual(
        expect.objectContaining({
          name: 'User Service > should delete a user',
        }),
      );
      expect(testCases).toContainEqual(
        expect.objectContaining({
          name: 'User Service > nested > should handle nested tests',
        }),
      );

      await fs.promises.rm(tmpDir, { recursive: true });
    });
  });

  /**
   * Unit test: FileIndexResult structure
   * Tests: correct FileIndexResult format, language detection
   * @reference ingest_spec.md §3 (FileIndexResult structure)
   */
  describe('FileIndexResult Structure (ingest_spec.md §3)', () => {
    it('should return correct FileIndexResult structure', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'indexer-test-'));
      const testFile = path.join(tmpDir, 'example.ts');
      const code = 'export const PI = 3.14;';

      await fs.promises.writeFile(testFile, code);

      const results = await tsIndexer.indexFiles({
        codebaseRoot: tmpDir,
        snapshotId: 'test:abc123',
        filePaths: ['example.ts'],
      });

      expect(results).toHaveLength(1);
      const result = results[0]!;

      expect(result).toMatchObject({
        filePath: 'example.ts',
        language: 'ts',
        symbols: expect.any(Array),
        calls: expect.any(Array),
        references: expect.any(Array),
        boundaries: expect.any(Array),
        testCases: expect.any(Array),
      });

      await fs.promises.rm(tmpDir, { recursive: true });
    });
  });

  /**
   * Unit test: File type handling
   * Tests: .ts, .tsx, .js, .mjs extensions
   */
  describe('File Type Handling', () => {
    it('should handle .ts files', () => {
      expect(tsIndexer.canHandleFile('test.ts')).toBe(true);
    });

    it('should handle .tsx files', () => {
      expect(tsIndexer.canHandleFile('component.tsx')).toBe(true);
    });

    it('should handle .js files', () => {
      expect(tsIndexer.canHandleFile('script.js')).toBe(true);
    });

    it('should handle .mjs files', () => {
      expect(tsIndexer.canHandleFile('module.mjs')).toBe(true);
    });

    it('should reject non-JS files', () => {
      expect(tsIndexer.canHandleFile('readme.md')).toBe(false);
      expect(tsIndexer.canHandleFile('style.css')).toBe(false);
      expect(tsIndexer.canHandleFile('image.png')).toBe(false);
    });
  });
});
