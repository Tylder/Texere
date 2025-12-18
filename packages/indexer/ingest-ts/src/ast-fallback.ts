/**
 * @file AST Fallback – TypeScript/JavaScript Symbol Extraction via Compiler API
 * @description Extract symbols using TypeScript compiler API when SCIP unavailable or gaps detected
 * @reference ts_ingest_spec.md §3.3, §4 (AST fallback, node extraction rules)
 * @reference 2a1-ts-symbol-extraction.md §5.3 (implementation details)
 * @reference symbol_id_stability_spec.md §2.1 (symbol ID formula)
 */

import * as path from 'node:path';

import * as ts from 'typescript';

import type { Range } from '@repo/indexer-types';

import { getDocstring, getNameFromNode, getRange } from './symbol-kinds.js';

/**
 * Symbol extracted via AST with complete metadata and confidence tagging.
 * Cite: ts_ingest_spec.md §3.3, §4
 */
export interface AstSymbol {
  id: string; // Stable ID per symbol_id_stability_spec §2.1
  name: string;
  kind: 'function' | 'class' | 'method' | 'interface' | 'type' | 'enum' | 'const' | 'other';
  range: Range;
  filePath: string;
  isExported: boolean;
  docstring: string | undefined;
  confidence: 'ast' | 'heuristic';
  note: string | undefined; // e.g., 'scip-gap:decorator-shorthand'
}

/**
 * Generate stable symbol ID per formula.
 * Cite: symbol_id_stability_spec.md §2.1
 * Formula: ${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}
 *
 * @param snapshotId – Snapshot identifier
 * @param filePath – File path relative to codebase root
 * @param symbolName – Symbol name
 * @param startLine – 1-indexed start line
 * @param startCol – 1-indexed start column
 * @returns Stable symbol ID
 */
function generateSymbolId(
  snapshotId: string,
  filePath: string,
  symbolName: string,
  startLine: number,
  startCol: number,
): string {
  return `${snapshotId}:${filePath}:${symbolName}:${startLine}:${startCol}`;
}

/**
 * Check if a node is exported from module scope.
 * Cite: ts_ingest_spec.md §3.5 (export detection)
 *
 * @param node – TypeScript AST node
 * @returns true if node has export modifier
 */
function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;

  if (!modifiers || modifiers.length === 0) {
    return false;
  }

  return modifiers.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Extract symbols from a TypeScript source file via AST walking.
 * Cite: ts_ingest_spec.md §3.3, §4 (AST fallback rules)
 *
 * @param sourceFile – TypeScript source file
 * @param typeChecker – TypeScript type checker (for symbol context)
 * @param snapshotId – Snapshot identifier
 * @param filePath – Relative file path
 * @returns Array of extracted symbols
 */
/**
 * Create a symbol object from extracted metadata.
 * Cite: ts_ingest_spec.md §4 (symbol creation)
 */
function createSymbol(
  name: string,
  kind: AstSymbol['kind'],
  node:
    | ts.FunctionDeclaration
    | ts.ClassDeclaration
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.EnumDeclaration
    | ts.MethodDeclaration,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol {
  const range = getRange(sourceFile, node);
  return {
    id: generateSymbolId(snapshotId, filePath, name, range.startLine, range.startCol),
    name,
    kind,
    range,
    filePath,
    isExported: isExported(node),
    docstring: getDocstring(node, sourceFile),
    confidence: 'ast',
    note: undefined,
  };
}

/**
 * Extract methods from class node.
 * Cite: ts_ingest_spec.md §4.2 (class methods)
 */
function extractClassMethods(
  classNode: ts.ClassDeclaration,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  const methods: AstSymbol[] = [];
  classNode.forEachChild((methodNode) => {
    if (ts.isMethodDeclaration(methodNode) && methodNode.name) {
      const methodName = getNameFromNode(methodNode);
      if (methodName) {
        methods.push(
          createSymbol(methodName, 'method', methodNode, snapshotId, filePath, sourceFile),
        );
      }
    }
  });
  return methods;
}

/**
 * Extract variable declarations from statement.
 * Cite: ts_ingest_spec.md §4.5 (variable declarations)
 */
function extractVariableDeclarations(
  varStmt: ts.VariableStatement,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  const vars: AstSymbol[] = [];
  varStmt.declarationList.declarations.forEach((decl) => {
    if (decl.name && ts.isIdentifier(decl.name)) {
      const name = decl.name.text;
      const range = getRange(sourceFile, decl);
      const symbol: AstSymbol = {
        id: generateSymbolId(snapshotId, filePath, name, range.startLine, range.startCol),
        name,
        kind: 'const',
        range,
        filePath,
        isExported: isExported(varStmt),
        docstring: getDocstring(varStmt, sourceFile),
        confidence: 'ast',
        note: undefined,
      };
      vars.push(symbol);
    }
  });
  return vars;
}

/**
 * Process function declaration and extract symbol.
 * Cite: ts_ingest_spec.md §4.1
 */
function processFunctionDeclaration(
  node: ts.Node,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  if (!ts.isFunctionDeclaration(node) || !node.name) {
    return [];
  }
  const name = getNameFromNode(node);
  if (!name) {
    return [];
  }
  return [createSymbol(name, 'function', node, snapshotId, filePath, sourceFile)];
}

/**
 * Process class declaration and extract symbol + methods.
 * Cite: ts_ingest_spec.md §4.2
 */
function processClassDeclaration(
  node: ts.Node,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  if (!ts.isClassDeclaration(node) || !node.name) {
    return [];
  }
  const name = getNameFromNode(node);
  if (!name) {
    return [];
  }
  const symbols = [createSymbol(name, 'class', node, snapshotId, filePath, sourceFile)];
  symbols.push(...extractClassMethods(node, snapshotId, filePath, sourceFile));
  return symbols;
}

/**
 * Process interface declaration and extract symbol.
 * Cite: ts_ingest_spec.md §4.3
 */
function processInterfaceDeclaration(
  node: ts.Node,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  if (!ts.isInterfaceDeclaration(node) || !node.name) {
    return [];
  }
  const name = getNameFromNode(node);
  if (!name) {
    return [];
  }
  return [createSymbol(name, 'interface', node, snapshotId, filePath, sourceFile)];
}

/**
 * Process type alias declaration and extract symbol.
 * Cite: ts_ingest_spec.md §4.3
 */
function processTypeAliasDeclaration(
  node: ts.Node,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  if (!ts.isTypeAliasDeclaration(node) || !node.name) {
    return [];
  }
  const name = getNameFromNode(node);
  if (!name) {
    return [];
  }
  return [createSymbol(name, 'type', node, snapshotId, filePath, sourceFile)];
}

/**
 * Process enum declaration and extract symbol.
 * Cite: ts_ingest_spec.md §4.4
 */
function processEnumDeclaration(
  node: ts.Node,
  snapshotId: string,
  filePath: string,
  sourceFile: ts.SourceFile,
): AstSymbol[] {
  if (!ts.isEnumDeclaration(node) || !node.name) {
    return [];
  }
  const name = getNameFromNode(node);
  if (!name) {
    return [];
  }
  return [createSymbol(name, 'enum', node, snapshotId, filePath, sourceFile)];
}

function walkAst(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  snapshotId: string,
  filePath: string,
): AstSymbol[] {
  const symbols: AstSymbol[] = [];

  /**
   * Visitor function to extract symbols from AST nodes.
   * Recursively walks the tree and collects declarations.
   */
  function visit(node: ts.Node): void {
    // Variable declarations (const/let/var at module level)
    // Cite: ts_ingest_spec.md §4.5
    if (ts.isVariableStatement(node)) {
      symbols.push(...extractVariableDeclarations(node, snapshotId, filePath, sourceFile));
      ts.forEachChild(node, visit);
      return;
    }

    // Process declarations via extracted functions to reduce complexity
    symbols.push(...processFunctionDeclaration(node, snapshotId, filePath, sourceFile));
    symbols.push(...processClassDeclaration(node, snapshotId, filePath, sourceFile));
    symbols.push(...processInterfaceDeclaration(node, snapshotId, filePath, sourceFile));
    symbols.push(...processTypeAliasDeclaration(node, snapshotId, filePath, sourceFile));
    symbols.push(...processEnumDeclaration(node, snapshotId, filePath, sourceFile));

    // Recurse into children
    ts.forEachChild(node, visit);
  }

  // Start traversal from root
  visit(sourceFile);

  return symbols;
}

/**
 * Run AST extraction on a set of files.
 * Cite: ts_ingest_spec.md §3.3 (AST fallback)
 *
 * @param codebaseRoot – Root directory of codebase
 * @param filePaths – Relative file paths to extract symbols from
 * @param snapshotId – Snapshot identifier
 * @returns Array of extracted symbols
 */
export function runAstFallback(
  codebaseRoot: string,
  filePaths: string[],
  snapshotId: string,
): AstSymbol[] {
  const symbols: AstSymbol[] = [];

  // Create TypeScript program with all files
  // This allows cross-file type checking (optional but useful for accuracy)
  const absolutePaths = filePaths.map((fp) => path.join(codebaseRoot, fp));

  // Try to find tsconfig.json for compilerOptions
  const tsconfigPath = path.join(codebaseRoot, 'tsconfig.json');
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };

  // Attempt to load tsconfig.json if it exists
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/consistent-type-imports
    const fsModule = require('node:fs') as typeof import('node:fs');
    const configFile = ts.readConfigFile(tsconfigPath, (filePath) => {
      return fsModule.readFileSync(filePath, 'utf-8');
    });

    if (configFile.config) {
      const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, codebaseRoot);
      compilerOptions = parsedConfig.options;
    }
  } catch {
    // Fall back to defaults if tsconfig.json not found or unreadable
  }

  // Create program
  const program = ts.createProgram(absolutePaths, compilerOptions, {
    getSourceFile: (fileName) => {
      const content = ts.sys.readFile(fileName) || '';
      const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
      return source;
    },
    writeFile: () => undefined,
    getCurrentDirectory: () => codebaseRoot,
    getDirectories: () => [],
    fileExists: (fileName) => ts.sys.fileExists(fileName),
    readFile: (fileName) => ts.sys.readFile(fileName),
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    getNewLine: () => ts.sys.newLine,
    getDefaultLibFileName: () => 'lib.d.ts',
  });

  const typeChecker = program.getTypeChecker();

  // Extract symbols from each file
  for (const filePath of filePaths) {
    const absolutePath = path.join(codebaseRoot, filePath);
    const sourceFile = program.getSourceFile(absolutePath);

    if (!sourceFile) {
      continue;
    }

    // Walk AST and collect symbols
    const fileSymbols = walkAst(sourceFile, typeChecker, snapshotId, filePath);
    symbols.push(...fileSymbols);
  }

  return symbols;
}
