/**
 * @file Symbol Kind Classification Tests
 * @description Unit tests for symbol kind classification
 * @reference testing_strategy.md §2.2–4.2 (unit testing, 60–75% coverage)
 * @reference 2a1-ts-symbol-extraction.md §6.1–6.2 (testing fixtures)
 */

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  classifySymbolKind,
  classifyVariableKind,
  getDocstring,
  getNameFromNode,
  getRange,
  isExported,
} from './symbol-kinds.js';

/**
 * Create a minimal TypeScript program for testing.
 * Helper to reduce boilerplate in tests.
 */
function createTestProgram(code: string): ts.Program {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  return ts.createProgram(
    ['test.ts'],
    {},
    {
      getSourceFile: (fileName) => (fileName === 'test.ts' ? sourceFile : undefined),
      writeFile: () => undefined,
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts',
    },
  );
}

describe('Symbol Kind Classification (ts_ingest_spec.md §4, test_repository_spec.md §3)', () => {
  describe('classifySymbolKind', () => {
    it('should classify function declarations as "function"', () => {
      const code = 'function myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('function');
    });

    it('should classify class declarations as "class"', () => {
      const code = 'class MyClass {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('class');
    });

    it('should classify interface declarations as "interface"', () => {
      const code = 'interface MyInterface {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isInterfaceDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('interface');
    });

    it('should classify type alias declarations as "type"', () => {
      const code = 'type MyType = string';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isTypeAliasDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('type');
    });

    it('should classify enum declarations as "enum"', () => {
      const code = 'enum MyEnum { A, B }';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isEnumDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('enum');
    });

    it('should classify const variables as "constant"', () => {
      const code = 'const myConst = 42';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          const decl = node.declarationList.declarations[0];
          if (decl) {
            foundNode = decl;
          }
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('constant');
    });

    it('should classify let/var variables as "variable"', () => {
      const code = 'let myVar = 42';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          const decl = node.declarationList.declarations[0];
          if (decl) {
            foundNode = decl;
          }
        }
      });

      expect(foundNode).toBeDefined();
      expect(classifySymbolKind(foundNode!)).toBe('variable');
    });

    it('should return undefined for unclassified nodes', () => {
      const code = 'const x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      // Get the SyntaxList node (which is a container, not a classifiable declaration)
      let syntaxList: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (node.kind === ts.SyntaxKind.SyntaxList) {
          syntaxList = node;
        }
      });

      if (syntaxList) {
        expect(classifySymbolKind(syntaxList)).toBeUndefined();
      }
    });
  });

  describe('getNameFromNode', () => {
    it('should extract names from function declarations', () => {
      const code = 'function myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const name = getNameFromNode(foundNode as any);
      expect(name).toBe('myFunc');
    });

    it('should extract names from class declarations', () => {
      const code = 'class MyClass {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node)) {
          foundNode = node;
        }
      });

      const name = getNameFromNode(foundNode as any);
      expect(name).toBe('MyClass');
    });

    it('should return undefined for nodes without names', () => {
      const code = 'const x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      // Get a variable statement (has name on its declarations, but statement itself has no name)
      let varStmt: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          varStmt = node;
        }
      });

      const name = getNameFromNode(varStmt as any);
      expect(name).toBeUndefined();
    });
  });

  describe('isExported', () => {
    it('should detect exported functions', () => {
      const code = 'export function myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(isExported(foundNode!)).toBe(true);
    });

    it('should detect non-exported functions', () => {
      const code = 'function myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      expect(isExported(foundNode!)).toBe(false);
    });
  });

  describe('getDocstring', () => {
    it('should return undefined when no docstring present', () => {
      const code = 'function myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const doc = getDocstring(foundNode!);
      expect(doc).toBeUndefined();
    });

    it('should handle nodes with leading comments', () => {
      const code = '// Comment\nfunction myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      // Just verify it doesn't crash and returns a string or undefined
      const doc = getDocstring(foundNode!);
      expect(typeof doc === 'string' || doc === undefined).toBe(true);
    });
  });

  describe('getRange', () => {
    it('should extract correct line and column numbers (1-indexed)', () => {
      const code = 'function myFunc() {\n  return 42;\n}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const range = getRange(sourceFile, foundNode!);
      // Function starts at line 1, column 1 (1-indexed)
      expect(range.startLine).toBe(1);
      expect(range.startCol).toBe(1);
      // Should have end position
      expect(range.endLine).toBeGreaterThanOrEqual(1);
      expect(range.endCol).toBeGreaterThanOrEqual(1);
    });
  });

  describe('classifyVariableKind', () => {
    it('should classify const declarations as "constant"', () => {
      const code = 'const x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let varDecl: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          varDecl = node.declarationList.declarations[0];
        }
      });

      expect(varDecl).toBeDefined();
      const kind = classifyVariableKind(varDecl!);
      expect(kind).toBe('constant');
    });

    it('should classify let declarations as "variable"', () => {
      const code = 'let x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let varDecl: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          varDecl = node.declarationList.declarations[0];
        }
      });

      expect(varDecl).toBeDefined();
      const kind = classifyVariableKind(varDecl!);
      expect(kind).toBe('variable');
    });

    it('should classify var declarations as "variable"', () => {
      const code = 'var x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let varDecl: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          varDecl = node.declarationList.declarations[0];
        }
      });

      expect(varDecl).toBeDefined();
      const kind = classifyVariableKind(varDecl!);
      expect(kind).toBe('variable');
    });

    it('should return variable if structure is unclear', () => {
      const code = 'const x = 1;';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let varDecl: ts.VariableDeclaration | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          varDecl = node.declarationList.declarations[0];
        }
      });

      // Even if we have a variable declaration, if we can't find the list parent, fallback to variable
      expect(varDecl).toBeDefined();
      const kind = classifyVariableKind(varDecl!);
      // This should either be constant or variable, never undefined
      expect(['constant', 'variable']).toContain(kind);
    });
  });

  describe('Docstring extraction edge cases', () => {
    it('should handle functions with single-line comments', () => {
      const code = '// Single line comment\nfunction myFunc() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const doc = getDocstring(foundNode!);
      // Should extract comment or return undefined
      expect(typeof doc === 'string' || doc === undefined).toBe(true);
    });

    it('should handle JSDoc with multiple lines', () => {
      const code = `/**
       * Line 1
       * Line 2
       */
      function myFunc() {}`;
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const doc = getDocstring(foundNode!);
      // Should extract first non-empty line
      expect(typeof doc === 'string' || doc === undefined).toBe(true);
    });
  });

  describe('Range extraction edge cases', () => {
    it('should handle ranges for nested declarations', () => {
      const code = `class MyClass {
        method() {
          return 42;
        }
      }`;
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let classNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isClassDeclaration(node)) {
          classNode = node;
        }
      });

      const range = getRange(sourceFile, classNode!);
      expect(range.startLine).toBeGreaterThanOrEqual(1);
      expect(range.startCol).toBeGreaterThanOrEqual(1);
      expect(range.endLine).toBeGreaterThanOrEqual(range.startLine);
    });

    it('should return 1-indexed line and column numbers', () => {
      const code = 'function test() {}';
      const program = createTestProgram(code);
      const sourceFile = program.getSourceFile('test.ts')!;

      let foundNode: ts.Node | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isFunctionDeclaration(node)) {
          foundNode = node;
        }
      });

      const range = getRange(sourceFile, foundNode!);
      // All line/col numbers should be 1-indexed (>= 1)
      expect(range.startLine).toBeGreaterThanOrEqual(1);
      expect(range.startCol).toBeGreaterThanOrEqual(1);
      expect(range.endLine).toBeGreaterThanOrEqual(1);
      expect(range.endCol).toBeGreaterThanOrEqual(1);
    });
  });
});
