/* eslint-disable check-file/filename-naming-convention -- .d.ts declaration files have different naming conventions */
// Type declarations for @c4312/scip to avoid module format issues in consuming packages.

declare module '@c4312/scip' {
  export interface Index {
    metadata?: Metadata;
    documents: Document[];
    externalSymbols: SymbolInformation[];
  }

  export interface Metadata {
    version: number;
    toolInfo?: ToolInfo;
    projectRoot: string;
    textDocumentEncoding: number;
  }

  export interface ToolInfo {
    name: string;
    version: string;
    arguments: string[];
  }

  export interface Document {
    language: string;
    relativePath: string;
    occurrences: Occurrence[];
    symbols: SymbolInformation[];
    text: string;
    positionEncoding: number;
  }

  export interface SymbolInformation {
    symbol: string;
    documentation: string[];
    relationships: Relationship[];
    kind: number;
    displayName: string;
    signatureDocumentation?: unknown;
    enclosingSymbol: string;
  }

  export interface Relationship {
    symbol: string;
    isReference: boolean;
    isImplementation: boolean;
    isTypeDefinition: boolean;
    isDefinition: boolean;
  }

  export interface Occurrence {
    range: number[];
    symbol: string;
    symbolRoles: number;
    overrideDocumentation: string[];
    syntaxKind: number;
    diagnostics: Diagnostic[];
    enclosingRange: number[];
  }

  export interface Diagnostic {
    severity: number;
    code: string;
    message: string;
    source: string;
    tags: number[];
  }

  export function deserializeSCIP(bytes: Uint8Array): Index;
  export function serializeSCIP(index: Index): Uint8Array;
}
