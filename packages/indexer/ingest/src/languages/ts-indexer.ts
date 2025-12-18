/**
 * @file TypeScript/JavaScript Language Indexer
 * @description Extracts symbols, calls, references, boundaries, and test cases from TS/JS files
 * @reference docs/specs/feature/indexer/ingest_spec.md §3-5
 * @reference docs/specs/feature/indexer/language_indexers_spec.md
 * @reference docs/specs/feature/indexer/symbol_id_stability_spec.md
 * @reference docs/specs/feature/indexer/test_repository_spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import * as ts from 'typescript';

import type {
  FileIndexResult,
  LanguageIndexer,
  SymbolIndex,
  CallIndex,
  ReferenceIndex,
  BoundaryIndex,
  TestCaseIndex,
  Range,
} from '@repo/indexer-types';

/**
 * Symbol ID generation per symbol_id_stability_spec.md
 * Format: ${snapshotId}:${filePath}:${name}:${startLine}:${startCol}
 */
function generateSymbolId(
  snapshotId: string,
  filePath: string,
  name: string,
  startLine: number,
  startCol: number,
): string {
  return `${snapshotId}:${filePath}:${name}:${startLine}:${startCol}`;
}

/**
 * Convert TypeScript SourceLocation to our Range interface
 */
function getRange(sourceFile: ts.SourceFile, node: ts.Node): Range {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1, // 1-indexed
    startCol: start.character + 1,
    endLine: end.line + 1,
    endCol: end.character + 1,
  };
}

/**
 * Extract docstring/JSDoc comment for a symbol
 */
function getDocstring(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
  const text = sourceFile.text;
  const leadingComments = ts.getLeadingCommentRanges(text, node.getFullStart());
  if (leadingComments && leadingComments.length > 0) {
    const lastComment = leadingComments[leadingComments.length - 1];
    if (lastComment) {
      const commentText = text.slice(lastComment.pos, lastComment.end);
      // Simple extraction: grab first line of JSDoc/comment
      const match = commentText.match(/^\/\*\*?\s*(.*?)\s*\*\//);
      return match ? match[1] : undefined;
    }
  }
  return undefined;
}

/**
 * Determine if a symbol is exported
 */
function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}

/**
 * Extract all symbols from a TS source file
 * Covers: functions, classes, methods, interfaces, types, enums, constants
 *
 * @reference ingest_spec.md §3 (SymbolIndex structure)
 * @reference test_repository_spec.md (symbol extraction expectations)
 * @sonarjs/cognitive-complexity
 */

function extractSymbols(
  sourceFile: ts.SourceFile,
  snapshotId: string,
  filePath: string,
): SymbolIndex[] {
  const symbols: SymbolIndex[] = [];

  function visit(node: ts.Node): void {
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const range = getRange(sourceFile, node);
      const docstring = getDocstring(node, sourceFile);
      const symbolObj: SymbolIndex = {
        id: generateSymbolId(snapshotId, filePath, node.name.text, range.startLine, range.startCol),
        name: node.name.text,
        kind: 'function',
        range,
        isExported: isExported(node),
      };
      if (docstring) {
        symbolObj.docstring = docstring;
      }
      symbols.push(symbolObj);
    }

    // Helper to create symbol object
    function createSymbol(
      id: string,
      name: string,
      kind: SymbolIndex['kind'],
      range: Range,
      exported: boolean,
      docNode: ts.Node,
    ): SymbolIndex {
      const docstring = getDocstring(docNode, sourceFile);
      const symbolObj: SymbolIndex = {
        id,
        name,
        kind,
        range,
        isExported: exported,
      };
      if (docstring) {
        symbolObj.docstring = docstring;
      }
      return symbolObj;
    }

    // Class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const range = getRange(sourceFile, node);
      symbols.push(
        createSymbol(
          generateSymbolId(snapshotId, filePath, node.name.text, range.startLine, range.startCol),
          node.name.text,
          'class',
          range,
          isExported(node),
          node,
        ),
      );

      // Extract methods from class
      node.members.forEach((member) => {
        if (
          (ts.isMethodDeclaration(member) ||
            ts.isGetAccessorDeclaration(member) ||
            ts.isSetAccessorDeclaration(member)) &&
          member.name
        ) {
          const methodRange = getRange(sourceFile, member);
          let methodName: string;
          if (typeof member.name === 'object' && 'text' in member.name) {
            methodName = (member.name as ts.Identifier).text;
          } else if (ts.isPrivateIdentifier(member.name)) {
            // PrivateIdentifier has escapedText property (private field names)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            methodName = `#${String((member.name as any).escapedText)}`;
          } else {
            methodName = '';
          }
          symbols.push(
            createSymbol(
              generateSymbolId(
                snapshotId,
                filePath,
                methodName,
                methodRange.startLine,
                methodRange.startCol,
              ),
              methodName,
              'method',
              methodRange,
              false, // Methods inherit class export status
              member,
            ),
          );
        }
      });
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const range = getRange(sourceFile, node);
      symbols.push(
        createSymbol(
          generateSymbolId(snapshotId, filePath, node.name.text, range.startLine, range.startCol),
          node.name.text,
          'interface',
          range,
          isExported(node),
          node,
        ),
      );
    }

    // Type aliases
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const range = getRange(sourceFile, node);
      symbols.push(
        createSymbol(
          generateSymbolId(snapshotId, filePath, node.name.text, range.startLine, range.startCol),
          node.name.text,
          'type',
          range,
          isExported(node),
          node,
        ),
      );
    }

    // Enum declarations
    if (ts.isEnumDeclaration(node) && node.name) {
      const range = getRange(sourceFile, node);
      symbols.push(
        createSymbol(
          generateSymbolId(snapshotId, filePath, node.name.text, range.startLine, range.startCol),
          node.name.text,
          'type', // Enums treated as types for simplicity
          range,
          isExported(node),
          node,
        ),
      );
    }

    // Variable declarations (const, let, var)
    if (
      ts.isVariableStatement(node) &&
      !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)
    ) {
      node.declarationList.declarations.forEach((decl) => {
        if (ts.isIdentifier(decl.name)) {
          const range = getRange(sourceFile, decl);
          symbols.push(
            createSymbol(
              generateSymbolId(
                snapshotId,
                filePath,
                decl.name.text,
                range.startLine,
                range.startCol,
              ),
              decl.name.text,
              'const',
              range,
              isExported(node),
              node,
            ),
          );
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return symbols;
}

/**
 * Extract function calls from a TS source file
 * Identifies CallExpression nodes and maps to caller/callee symbol pairs
 *
 * @reference ingest_spec.md §4 (CallIndex structure)
 * @reference edges/REFERENCES.md (CALL sub-type)
 * @sonarjs/cognitive-complexity
 */
/**
 * Helper to get method name from node.name (identifier or private identifier)
 */
function getMethodName(name: ts.PropertyName): string {
  if (typeof name === 'object' && 'text' in name) {
    return (name as ts.Identifier).text;
  }
  if (ts.isPrivateIdentifier(name)) {
    // PrivateIdentifier has escapedText property (private field names)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return `#${String((name as any).escapedText)}`;
  }
  return '';
}

/**
 * Helper to determine next symbol context when entering scope
 */
function getNextSymbolContext(
  node: ts.Node,
  symbolsByName: Map<string, SymbolIndex>,
): SymbolIndex | undefined {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return symbolsByName.get(node.name.text);
  }
  if (ts.isClassDeclaration(node) && node.name) {
    return symbolsByName.get(node.name.text);
  }
  if (
    (ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.name
  ) {
    return symbolsByName.get(getMethodName(node.name));
  }
  return undefined;
}

/**
 * Helper to extract callee name from call expression
 */
function extractCalleeName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name)) {
    return expr.name.text;
  }
  return undefined;
}

/**
 * Helper to record a call if callee symbol exists
 */
function recordCallIfFound(
  calls: CallIndex[],
  calleeName: string,
  containingSymbol: SymbolIndex,
  symbolsByName: Map<string, SymbolIndex>,
  sourceFile: ts.SourceFile,
  expr: ts.Expression,
  filePath: string,
): void {
  const calleeSymbol = symbolsByName.get(calleeName);
  if (!calleeSymbol) return;

  const start = sourceFile.getLineAndCharacterOfPosition(expr.getStart());
  calls.push({
    callerSymbolId: containingSymbol.id,
    calleeSymbolId: calleeSymbol.id,
    location: {
      filePath,
      line: start.line + 1,
      col: start.character + 1,
    },
  });
}

function extractCalls(
  sourceFile: ts.SourceFile,
  snapshotId: string,
  filePath: string,
  symbols: SymbolIndex[],
): CallIndex[] {
  const calls: CallIndex[] = [];
  const symbolsByName = new Map<string, SymbolIndex>();
  symbols.forEach((sym) => {
    symbolsByName.set(sym.name, sym);
  });

  function visit(node: ts.Node, containingSymbol?: SymbolIndex): void {
    if (ts.isCallExpression(node)) {
      const calleeName = extractCalleeName(node.expression);
      if (calleeName && containingSymbol) {
        recordCallIfFound(
          calls,
          calleeName,
          containingSymbol,
          symbolsByName,
          sourceFile,
          node.expression,
          filePath,
        );
      }
    }

    const nextSymbol = getNextSymbolContext(node, symbolsByName);
    ts.forEachChild(node, (child) => visit(child, nextSymbol || containingSymbol));
  }

  visit(sourceFile);
  return calls;
}

/**
 * Helper to record import references
 */
function recordImportReferences(
  references: ReferenceIndex[],
  importClause: ts.ImportClause,
  containingSymbol: SymbolIndex | undefined,
  sourceFile: ts.SourceFile,
  filePath: string,
): void {
  if (!containingSymbol) return;
  const start = sourceFile.getLineAndCharacterOfPosition(importClause.getStart());

  // Named imports
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    importClause.namedBindings.elements.forEach((element) => {
      if (ts.isImportSpecifier(element)) {
        references.push({
          fromSymbolId: containingSymbol.id,
          toSymbolId: `external:${element.name.text}`,
          type: 'IMPORT',
          location: { filePath, line: start.line + 1, col: start.character + 1 },
        });
      }
    });
  }

  // Default import
  if (importClause.name) {
    references.push({
      fromSymbolId: containingSymbol.id,
      toSymbolId: `external:${importClause.name.text}`,
      type: 'IMPORT',
      location: { filePath, line: start.line + 1, col: start.character + 1 },
    });
  }
}

/**
 * Helper to record type reference
 */
function recordTypeReference(
  references: ReferenceIndex[],
  refName: string,
  referencedSymbol: SymbolIndex,
  containingSymbol: SymbolIndex,
  sourceFile: ts.SourceFile,
  typeRefNode: ts.TypeReferenceNode,
  filePath: string,
): void {
  const start = sourceFile.getLineAndCharacterOfPosition(typeRefNode.getStart());
  references.push({
    fromSymbolId: containingSymbol.id,
    toSymbolId: referencedSymbol.id,
    type: 'TYPE_REF',
    location: { filePath, line: start.line + 1, col: start.character + 1 },
  });
}

/**
 * Extract references (imports, type refs, patterns) from a TS source file
 *
 * @reference ingest_spec.md §4 (ReferenceIndex structure)
 * @reference edges/REFERENCES.md (TYPE_REF, IMPORT, PATTERN sub-types)
 * @sonarjs/cognitive-complexity
 */
function extractReferences(
  sourceFile: ts.SourceFile,
  snapshotId: string,
  filePath: string,
  symbols: SymbolIndex[],
): ReferenceIndex[] {
  const references: ReferenceIndex[] = [];
  const symbolsByName = new Map<string, SymbolIndex>();
  symbols.forEach((sym) => {
    symbolsByName.set(sym.name, sym);
  });

  function visit(node: ts.Node, containingSymbol?: SymbolIndex): void {
    if (ts.isImportDeclaration(node) && node.importClause) {
      recordImportReferences(references, node.importClause, containingSymbol, sourceFile, filePath);
    }

    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && containingSymbol) {
      const refName = node.typeName.text;
      const referencedSymbol = symbolsByName.get(refName);
      if (referencedSymbol) {
        recordTypeReference(
          references,
          refName,
          referencedSymbol,
          containingSymbol,
          sourceFile,
          node,
          filePath,
        );
      }
    }

    const nextSymbol = getNextSymbolContext(node, symbolsByName);
    ts.forEachChild(node, (child) => visit(child, nextSymbol || containingSymbol));
  }

  visit(sourceFile);
  return references;
}

/**
 * Helper to extract handler name from handler argument
 */
function extractHandlerName(handlerArg: ts.Expression): string | undefined {
  if (ts.isIdentifier(handlerArg)) {
    return handlerArg.text;
  }
  if (ts.isArrowFunction(handlerArg) && handlerArg.name) {
    return (handlerArg.name as unknown as ts.Identifier)?.text;
  }
  return undefined;
}

/**
 * Helper to detect and record HTTP boundaries
 */
function recordBoundaryIfMatches(
  boundaries: BoundaryIndex[],
  callExpr: ts.CallExpression,
  symbolsByName: Map<string, SymbolIndex>,
): void {
  if (
    !ts.isPropertyAccessExpression(callExpr.expression) ||
    !ts.isIdentifier(callExpr.expression.name)
  ) {
    return;
  }

  const methodName = callExpr.expression.name.text.toUpperCase();
  const httpVerbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  if (!httpVerbs.includes(methodName) || callExpr.arguments.length < 2) {
    return;
  }

  const pathArg = callExpr.arguments[0];
  const handlerArg = callExpr.arguments[1];

  if (!pathArg || !ts.isStringLiteral(pathArg)) return;
  if (!handlerArg) return;
  const path = pathArg.text;

  const handlerName = extractHandlerName(handlerArg);
  if (!handlerName) return;

  const handlerSymbol = symbolsByName.get(handlerName);
  if (handlerSymbol) {
    boundaries.push({
      verb: methodName,
      path,
      handlerSymbolId: handlerSymbol.id,
      kind: 'http',
    });
  }
}

/**
 * Detect HTTP boundaries (Express routes)
 * Looks for patterns: app.get(...), router.post(...), etc.
 *
 * @reference language_indexers_spec.md §3.1 (Express boundary detection)
 * @reference test_repository_spec.md (boundary expectations)
 * @reference nodes/Boundary.md (boundary node schema)
 * @sonarjs/cognitive-complexity
 */
function extractBoundaries(
  sourceFile: ts.SourceFile,
  snapshotId: string,
  filePath: string,
  symbols: SymbolIndex[],
): BoundaryIndex[] {
  const boundaries: BoundaryIndex[] = [];
  const symbolsByName = new Map<string, SymbolIndex>();
  symbols.forEach((sym) => {
    symbolsByName.set(sym.name, sym);
  });

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      recordBoundaryIfMatches(boundaries, node, symbolsByName);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return boundaries;
}

/**
 * Detect test cases from vitest/jest patterns
 * Looks for: describe(...), it(...), test(...) calls
 *
 * @reference ingest_spec.md §5.1 (test detection)
 * @reference test_repository_spec.md (TestCase expectations)
 */
function extractTestCases(
  sourceFile: ts.SourceFile,
  snapshotId: string,
  filePath: string,
): TestCaseIndex[] {
  const testCases: TestCaseIndex[] = [];

  function visit(node: ts.Node, describeStack: string[] = []): void {
    // describe(...) or it(...) or test(...)
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'describe' ||
        node.expression.text === 'it' ||
        node.expression.text === 'test')
    ) {
      const testType = node.expression.text;
      const nameArg = node.arguments[0];

      if (nameArg && ts.isStringLiteral(nameArg)) {
        const testName = nameArg.text;
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());

        // For describe blocks, update stack and process children
        if (testType === 'describe') {
          const fullName = [...describeStack, testName].join(' > ');
          testCases.push({
            id: `${snapshotId}:${filePath}:${fullName}`,
            name: fullName,
            location: {
              filePath,
              line: start.line + 1,
              col: start.character + 1,
            },
          });

          // Process callback function for nested tests
          const callbackArg = node.arguments[1];
          if (callbackArg) {
            if (ts.isFunctionExpression(callbackArg) || ts.isArrowFunction(callbackArg)) {
              ts.forEachChild(callbackArg, (child) => visit(child, [...describeStack, testName]));
            }
          }
          return; // Skip normal traversal for describe
        }

        // For it/test, record the test case
        if (testType === 'it' || testType === 'test') {
          const fullName = [...describeStack, testName].join(' > ');
          testCases.push({
            id: `${snapshotId}:${filePath}:${fullName}`,
            name: fullName,
            location: {
              filePath,
              line: start.line + 1,
              col: start.character + 1,
            },
          });
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, describeStack));
  }

  visit(sourceFile);
  return testCases;
}

/**
 * TypeScript/JavaScript Language Indexer
 * Implements the LanguageIndexer interface for TS/JS files
 *
 * @reference ingest_spec.md §2.2 (language indexer responsibility)
 * @reference ingest_spec.md §5.1 (TS extraction details)
 */
export const tsIndexer: LanguageIndexer = {
  languageIds: ['ts', 'tsx', 'js'],
  canHandleFile: (filePath: string): boolean => {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.mjs', '.cjs'].includes(ext);
  },
  indexFiles: async (args): Promise<FileIndexResult[]> => {
    const { codebaseRoot, snapshotId, filePaths } = args;
    const results: FileIndexResult[] = [];

    for (const filePath of filePaths) {
      try {
        const fullPath = path.join(codebaseRoot, filePath);
        const sourceCode = await fs.promises.readFile(fullPath, 'utf-8');

        const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

        const symbols = extractSymbols(sourceFile, snapshotId, filePath);
        const calls = extractCalls(sourceFile, snapshotId, filePath, symbols);
        const references = extractReferences(sourceFile, snapshotId, filePath, symbols);
        const boundaries = extractBoundaries(sourceFile, snapshotId, filePath, symbols);
        const testCases = extractTestCases(sourceFile, snapshotId, filePath);

        // Determine language from extension
        const ext = path.extname(filePath).toLowerCase();
        let language: 'ts' | 'tsx' | 'js' = 'js';
        if (ext === '.ts') language = 'ts';
        if (ext === '.tsx') language = 'tsx';

        results.push({
          filePath,
          language,
          symbols,
          calls,
          references,
          boundaries,
          testCases,
        });
      } catch (error) {
        // Log error and continue with next file
        // TODO: Implement proper error handling per ingest_spec.md §6.5
        console.error(`Failed to index ${filePath}:`, error);
      }
    }

    return results;
  },
};
