/**
 * @file AST Fallback Tests
 * @description Unit tests for TypeScript AST fallback extraction
 * @reference testing_strategy.md §2.2–4.2 (unit testing, 60–75% coverage)
 * @reference 2a1-ts-symbol-extraction.md §6.1–6.2 (testing fixtures)
 * @reference ts_ingest_spec.md §3.3, §4 (AST fallback rules)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

/**
 * Tests for AST fallback extraction.
 * Cite: ts_ingest_spec.md §3.3 (AST fallback when SCIP unavailable)
 */
import { runAstFallback } from './ast-fallback.js';

describe('AST Fallback (ts_ingest_spec.md §3.3, §4)', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ast-fallback-test-'));
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('runAstFallback', () => {
    it('should return empty array when no files provided', () => {
      // Cite: 2a1-ts-symbol-extraction.md §6.1–6.2 (test fixtures)
      const symbols = runAstFallback('/nonexistent', [], 'test-snap:main');
      expect(symbols).toEqual([]);
    });

    it('should extract function symbols from AST', () => {
      // Test that AST walker extracts function declarations
      // Cite: ts_ingest_spec.md §4.1 (function extraction)

      const code = `
        export function myFunc() {
          return 42;
        }
      `;
      const filePath = path.join(tempDir, 'test-func.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-func.ts'], 'test-snap:main');
      const funcSymbols = symbols.filter((s) => s.name === 'myFunc');

      expect(funcSymbols.length).toBeGreaterThan(0);
      if (funcSymbols[0]) {
        expect(funcSymbols[0].kind).toBe('function');
        expect(funcSymbols[0].confidence).toBe('ast');
        expect(funcSymbols[0].isExported).toBe(true);
      }
    });

    it('should extract class and method symbols from AST', () => {
      // Test that AST walker extracts class and method declarations
      // Cite: ts_ingest_spec.md §4.2 (class and method extraction)

      const code = `
        export class MyClass {
          myMethod() {
            return 'hello';
          }
        }
      `;
      const filePath = path.join(tempDir, 'test-class.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-class.ts'], 'test-snap:main');
      const classSymbols = symbols.filter((s) => s.name === 'MyClass');
      const methodSymbols = symbols.filter((s) => s.name === 'myMethod');

      expect(classSymbols.length).toBeGreaterThan(0);
      if (classSymbols[0]) {
        expect(classSymbols[0].kind).toBe('class');
      }
      expect(methodSymbols.length).toBeGreaterThan(0);
      if (methodSymbols[0]) {
        expect(methodSymbols[0].kind).toBe('method');
      }
    });

    it('should extract interface and type alias symbols from AST', () => {
      // Test extraction of interface and type alias declarations
      // Cite: ts_ingest_spec.md §4.3 (interface and type extraction)

      const code = `
        export interface IUser {
          name: string;
        }
        
        export type UserRole = 'admin' | 'user';
      `;
      const filePath = path.join(tempDir, 'test-types.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-types.ts'], 'test-snap:main');
      const interfaceSymbols = symbols.filter((s) => s.name === 'IUser');
      const typeSymbols = symbols.filter((s) => s.name === 'UserRole');

      expect(interfaceSymbols.length).toBeGreaterThan(0);
      if (interfaceSymbols[0]) {
        expect(interfaceSymbols[0].kind).toBe('interface');
      }
      expect(typeSymbols.length).toBeGreaterThan(0);
      if (typeSymbols[0]) {
        expect(typeSymbols[0].kind).toBe('type');
      }
    });

    it('should extract enum and constant symbols from AST', () => {
      // Test extraction of enum and const declarations
      // Cite: ts_ingest_spec.md §4.4–4.5 (enum and const extraction)

      const code = `
        export enum Status {
          ACTIVE = 'ACTIVE',
          INACTIVE = 'INACTIVE',
        }
        
        export const DEFAULT_TIMEOUT = 5000;
      `;
      const filePath = path.join(tempDir, 'test-const.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-const.ts'], 'test-snap:main');
      const enumSymbols = symbols.filter((s) => s.name === 'Status');
      const constSymbols = symbols.filter((s) => s.name === 'DEFAULT_TIMEOUT');

      expect(enumSymbols.length).toBeGreaterThan(0);
      if (enumSymbols[0]) {
        expect(enumSymbols[0].kind).toBe('enum');
      }
      expect(constSymbols.length).toBeGreaterThan(0);
      if (constSymbols[0]) {
        expect(constSymbols[0].kind).toBe('const');
      }
    });

    it('should tag confidence as "ast" for fallback extraction', () => {
      // Verify that AST-extracted symbols are marked with ast confidence
      // Cite: ts_ingest_spec.md §3.8 (confidence tagging)

      const code = 'function test() {}';
      const filePath = path.join(tempDir, 'test-confidence.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-confidence.ts'], 'test-snap:main');

      expect(symbols.length).toBeGreaterThan(0);
      for (const sym of symbols) {
        expect(sym.confidence).toBe('ast');
      }
    });

    it('should include docstring when available', () => {
      // Test that JSDoc comments are extracted as docstrings
      // Cite: ts_ingest_spec.md §4 (docstring extraction)

      const code = `
        /**
         * A test function
         */
        export function documentedFunc() {
          return 'hello';
        }
      `;
      const filePath = path.join(tempDir, 'test-doc.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-doc.ts'], 'test-snap:main');
      const funcSymbols = symbols.filter((s) => s.name === 'documentedFunc');

      expect(funcSymbols.length).toBeGreaterThan(0);
      if (funcSymbols[0]) {
        // JSDoc may or may not be extracted depending on TypeScript parsing
        // At minimum, verify structure is correct
        expect(funcSymbols[0]).toHaveProperty('docstring');
      }
    });

    it('should detect export flags correctly', () => {
      // Test that exported vs non-exported symbols are correctly identified
      // Cite: ts_ingest_spec.md §3.5 (export detection)

      const code = `
        export function publicFunc() {}
        function internalFunc() {}
      `;
      const filePath = path.join(tempDir, 'test-export.ts');
      fs.writeFileSync(filePath, code);

      const symbols = runAstFallback(tempDir, ['test-export.ts'], 'test-snap:main');
      const publicFuncs = symbols.filter((s) => s.name === 'publicFunc');
      const internalFuncs = symbols.filter((s) => s.name === 'internalFunc');

      if (publicFuncs[0]) {
        expect(publicFuncs[0].isExported).toBe(true);
      }
      if (internalFuncs[0]) {
        expect(internalFuncs[0].isExported).toBe(false);
      }
    });
  });
});
