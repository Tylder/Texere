/**
 * @file Symbol Kind Classification
 * @description Classify extracted TypeScript nodes into canonical symbol kinds
 * @reference ts_ingest_spec.md §4 (node extraction rules)
 * @reference test_repository_spec.md §3 (symbol kinds matrix)
 * @reference 2a1-ts-symbol-extraction.md §5.4 (implementation)
 */

import * as ts from 'typescript';

/**
 * Canonical symbol kinds extracted from TypeScript source.
 * Cite: ts_ingest_spec.md §4, test_repository_spec.md §3
 */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'enum'
  | 'constant'
  | 'variable'
  | 'parameter';

/**
 * Classify a TypeScript AST node into canonical symbol kind.
 * Cite: ts_ingest_spec.md §4 (node classification rules)
 *
 * @param node - TypeScript AST node to classify
 * @returns Canonical symbol kind or undefined if node cannot be classified
 */
export function classifySymbolKind(node: ts.Node): SymbolKind | undefined {
  // Function declarations
  if (ts.isFunctionDeclaration(node)) {
    return 'function';
  }

  // Class declarations
  if (ts.isClassDeclaration(node)) {
    return 'class';
  }

  // Method declarations (within classes)
  if (ts.isMethodDeclaration(node)) {
    return 'method';
  }

  // Interface declarations
  if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  }

  // Type alias declarations
  if (ts.isTypeAliasDeclaration(node)) {
    return 'type';
  }

  // Enum declarations
  if (ts.isEnumDeclaration(node)) {
    return 'enum';
  }

  // Variable declarations (const/let/var)
  if (ts.isVariableDeclaration(node)) {
    return classifyVariableKind(node);
  }

  // Parameter declarations
  if (ts.isParameter(node)) {
    return 'parameter';
  }

  // Unclassified
  return undefined;
}

/**
 * Classify variable declaration into 'constant' or 'variable'.
 * Cite: ts_ingest_spec.md §4.3 (variable classification)
 *
 * @param node - VariableDeclaration node
 * @returns 'constant' if const, 'variable' if let/var
 */
export function classifyVariableKind(node: ts.VariableDeclaration): 'constant' | 'variable' {
  // Walk up to find VariableDeclarationList (parent of parent)
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isVariableDeclarationList(current)) {
      // Check flags for const/let/var
      const flags = current.flags;
      if (flags & ts.NodeFlags.Const) {
        return 'constant';
      }
      // let or var
      return 'variable';
    }
    current = current.parent;
  }

  // Default to variable if structure unclear
  return 'variable';
}

/**
 * Extract the name from a TypeScript AST node.
 * Works for all named declarations (functions, classes, interfaces, types, etc.)
 * Cite: ts_ingest_spec.md §4 (name extraction)
 *
 * @param node - TypeScript AST node with name property
 * @returns The name string, or undefined if not a named node
 */
export function getNameFromNode(node: ts.Node & { name?: ts.Node }): string | undefined {
  if (!node.name) {
    return undefined;
  }

  // For identifiers, get text directly
  if (ts.isIdentifier(node.name)) {
    return node.name.text;
  }

  // For computed property names, we can't reliably extract text
  // These are typically dynamic and not useful for symbol extraction
  return undefined;
}

/**
 * Extract JSDoc/JSDoc comment from a node.
 * Returns first line of the comment text only.
 * Cite: 2a1-ts-symbol-extraction.md §5.4 (docstring extraction)
 *
 * @param node - TypeScript AST node
 * @returns First line of JSDoc comment, or undefined if none
 */
export function getDocstring(node: ts.Node): string | undefined {
  // Use the standard TypeScript compiler method to get JSDoc
  const jsDocs = ts.getJSDocCommentsAndTags(node);
  if (!jsDocs || jsDocs.length === 0) {
    return undefined;
  }

  // Process the first JSDoc comment
  const jsDoc = jsDocs[0];
  if (!jsDoc) {
    return undefined;
  }

  // For JSDoc nodes, extract the text
  let commentText = '';
  if (ts.isJSDoc(jsDoc)) {
    // JSDoc comment: get the comment string
    if (jsDoc.comment) {
      if (typeof jsDoc.comment === 'string') {
        commentText = jsDoc.comment;
      } else if (Array.isArray(jsDoc.comment)) {
        // comment is a NodeArray<JSDocComment>
        const parts: string[] = [];
        for (const c of jsDoc.comment) {
          if (typeof c === 'string') {
            parts.push(c);
          } else if ('text' in c && typeof (c as Record<string, unknown>)['text'] === 'string') {
            parts.push((c as Record<string, unknown>)['text'] as string);
          }
        }
        commentText = parts.join('');
      }
    }
  }

  // Clean up and return first line
  const cleanText = commentText.trim().split('\n')[0]?.trim();

  return cleanText || undefined;
}

/**
 * Check if a node is exported from module scope.
 * Looks for `export` keyword modifier.
 * Cite: ts_ingest_spec.md §3.5 (export detection)
 *
 * @param node - TypeScript AST node
 * @returns true if node has export modifier
 */
export function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;

  if (!modifiers || modifiers.length === 0) {
    return false;
  }

  return modifiers.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword);
}

/**
 * Get line and column positions from a node.
 * Cite: 2a1-ts-symbol-extraction.md §5.4 (range extraction)
 */
export interface NodeRange {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * Extract range (line/column) information from a TypeScript node.
 * Line/column numbers are 1-indexed (not 0-indexed) per symbol_id_stability_spec.md.
 *
 * @param sourceFile - Source file (needed for position conversion)
 * @param node - TypeScript AST node
 * @returns Range with 1-indexed line and column numbers
 */
export function getRange(sourceFile: ts.SourceFile, node: ts.Node): NodeRange {
  const startPos = node.getStart(sourceFile);
  const endPos = node.getEnd();

  // Convert byte offsets to line/column (getLineAndCharacterOfPosition returns 0-indexed)
  const startLineCol = sourceFile.getLineAndCharacterOfPosition(startPos);
  const endLineCol = sourceFile.getLineAndCharacterOfPosition(endPos);

  return {
    startLine: startLineCol.line + 1, // Convert to 1-indexed
    startCol: startLineCol.character + 1,
    endLine: endLineCol.line + 1,
    endCol: endLineCol.character + 1,
  };
}
