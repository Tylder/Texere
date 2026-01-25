import type {
  DeclaresTypeEdge,
  DefinesEdge,
  ImplementsEdge,
  InheritsFromEdge,
  Range,
  RefersToEdge,
  SymbolNode,
  TypeNode,
  FileNode,
} from '@repo/graph-core';
import type { GraphStore } from '@repo/graph-store';

export type ReferenceResult = {
  references: Array<{
    fileId: string;
    range: Range;
    referenceKind: 'call' | 'read' | 'write' | 'type';
    indirect: boolean;
  }>;
  stale: boolean;
};

export type DefinitionResult = {
  definitions: Array<{
    fileId: string;
    range: Range;
    definitionKind: 'declaration' | 'definition' | 'ambient';
  }>;
  stale: boolean;
};

export type ImplementationResult = {
  implementations: Array<{
    implementationId: string;
    fileId: string;
    range: Range;
    relationKind: 'implements' | 'overrides';
  }>;
  stale: boolean;
};

export type DependencyResult = {
  dependencies: Array<{
    targetSymbolId: string;
    relationship: 'call' | 'read' | 'write' | 'type' | 'inherit' | 'configuration';
  }>;
  stale: boolean;
};

export type ImpactResult = {
  impacted: Array<{
    impactedSymbolId: string;
    relationship: 'calledBy' | 'overriddenBy' | 'implements' | 'reExportedBy' | 'testedBy';
  }>;
  stale: boolean;
};

export type SimilarImplementationResult = {
  similar: Array<{
    implementationId: string;
    relationKind: 'implementsSameInterface' | 'extendsSameBase';
  }>;
  stale: boolean;
};

export type ExternalDependencyResult = {
  dependencies: Array<{
    packageName: string;
    version: string;
    symbols: string[];
  }>;
  stale: boolean;
};

export type TestsForSymbolResult = {
  tests: Array<{
    testFileId: string;
    testSymbolId: string | null;
    range: Range;
    coverageKind: 'direct' | 'indirect';
  }>;
  untestedPaths: Array<{
    fileId: string;
    reason: string;
  }>;
  stale: boolean;
};

export type RequiredModificationsResult = {
  touchPoints: Array<{
    symbolId: string;
    reason: 'implementInterface' | 'updateFactory' | 'addTest' | 'extendDocumentation';
  }>;
  stale: boolean;
};

export type ArchitecturalConstraintsResult = {
  constraints: Array<{
    ruleId: string;
    description: string;
    violated: boolean;
    violatingReference: {
      fileId: string;
      range: Range;
    } | null;
  }>;
  stale: boolean;
};

export interface GraphQueryService {
  getSymbolReferences(
    symbolId: string,
    opts?: { includeIndirect?: boolean; includeTypes?: boolean },
  ): Promise<ReferenceResult>;
  getSymbolDefinition(symbolId: string): Promise<DefinitionResult>;
  getSymbolImplementations(symbolId: string): Promise<ImplementationResult>;
  getSymbolDependencies(symbolId: string): Promise<DependencyResult>;
  getImpactOfChange(symbolId: string): Promise<ImpactResult>;
  findSimilarImplementations(symbolId: string): Promise<SimilarImplementationResult>;
  getExternalDependencies(symbolId: string): Promise<ExternalDependencyResult>;
  getTestsForSymbol(symbolId: string): Promise<TestsForSymbolResult>;
  getRequiredModifications(featureInterfaceId: string): Promise<RequiredModificationsResult>;
  getArchitecturalConstraints(symbolId: string): Promise<ArchitecturalConstraintsResult>;
}

export class InMemoryGraphQueryService implements GraphQueryService {
  constructor(private readonly store: GraphStore) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSymbolReferences(
    symbolId: string,
    opts?: { includeIndirect?: boolean; includeTypes?: boolean },
  ): Promise<ReferenceResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { references: [], stale: false };

    const includeTypes = opts?.includeTypes ?? false;
    const references: ReferenceResult['references'] = [];

    const primary = this.findRefersToEdges(target.id, includeTypes);
    for (const entry of primary) {
      references.push({ ...entry, indirect: false });
    }

    if (opts?.includeIndirect) {
      const relatedSymbolIds = new Set<string>();
      for (const edge of this.store.getEdges()) {
        if (edge.kind === 'IMPLEMENTS' || edge.kind === 'INHERITS_FROM') {
          if (edge.to === target.id) {
            relatedSymbolIds.add(edge.from);
          }
        }
      }

      for (const relatedId of relatedSymbolIds) {
        const relatedRefs = this.findRefersToEdges(relatedId, includeTypes);
        for (const entry of relatedRefs) {
          references.push({ ...entry, indirect: true });
        }
      }
    }

    const stale = this.isSymbolStale(
      target,
      references.map((ref) => ref.fileId),
    );
    return { references: sortByReference(references), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSymbolDefinition(symbolId: string): Promise<DefinitionResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { definitions: [], stale: false };

    const definitions: DefinitionResult['definitions'] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'DEFINES') continue;
      const defines = edge as DefinesEdge;
      if (defines.to !== target.id) continue;
      const file = this.getFileNode(defines.from);
      if (!file) continue;
      definitions.push({
        fileId: file.fileId,
        range: defines.range,
        definitionKind: defines.definitionKind,
      });
    }

    const stale = this.isSymbolStale(
      target,
      definitions.map((def) => def.fileId),
    );
    return { definitions: sortByDefinition(definitions), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSymbolImplementations(symbolId: string): Promise<ImplementationResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { implementations: [], stale: false };

    const implementations: ImplementationResult['implementations'] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind === 'IMPLEMENTS' && edge.to === target.id) {
        const implEdge = edge as ImplementsEdge;
        const implSymbol = this.getSymbolNode(implEdge.from);
        if (!implSymbol) continue;
        const location = this.findDefinitionLocation(implSymbol.id);
        implementations.push({
          implementationId: implSymbol.symbolId,
          fileId: location.fileId,
          range: location.range,
          relationKind: implEdge.relationKind,
        });
      }

      if (edge.kind === 'INHERITS_FROM' && edge.to === target.id) {
        const inherits = edge as InheritsFromEdge;
        const implSymbol = this.getSymbolNode(inherits.from);
        if (!implSymbol) continue;
        const location = this.findDefinitionLocation(implSymbol.id);
        implementations.push({
          implementationId: implSymbol.symbolId,
          fileId: location.fileId,
          range: location.range,
          relationKind: 'overrides',
        });
      }
    }

    const stale = this.isSymbolStale(
      target,
      implementations.map((impl) => impl.fileId),
    );
    return { implementations: sortByImplementation(implementations), stale };
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity, @typescript-eslint/require-await
  async getSymbolDependencies(symbolId: string): Promise<DependencyResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { dependencies: [], stale: false };

    const dependencies: DependencyResult['dependencies'] = [];
    const definitionFiles = this.findDefinitionFiles(target.id);
    for (const file of definitionFiles) {
      for (const edge of this.store.getEdges({ from: file.id })) {
        if (edge.kind === 'REFERS_TO') {
          const refers = edge as RefersToEdge;
          const symbol = this.getSymbolNode(refers.to);
          if (!symbol) continue;
          dependencies.push({
            targetSymbolId: symbol.symbolId,
            relationship: refers.referenceKind,
          });
        }
      }
    }

    for (const edge of this.store.getEdges()) {
      if (edge.kind === 'DECLARES_TYPE' && edge.from === target.id) {
        const declares = edge as DeclaresTypeEdge;
        const type = this.getTypeNode(declares.to);
        if (!type) continue;
        dependencies.push({ targetSymbolId: type.typeId, relationship: 'type' });
      }

      if (edge.kind === 'INHERITS_FROM' && edge.from === target.id) {
        const inherits = edge as InheritsFromEdge;
        const type = this.getTypeNode(inherits.to);
        if (!type) continue;
        dependencies.push({ targetSymbolId: type.typeId, relationship: 'inherit' });
      }
    }

    const stale = this.isSymbolStale(
      target,
      definitionFiles.map((file) => file.fileId),
    );
    return { dependencies: dedupeDependencies(dependencies), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getImpactOfChange(symbolId: string): Promise<ImpactResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { impacted: [], stale: false };

    const impacted: ImpactResult['impacted'] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind === 'REFERS_TO' && edge.to === target.id) {
        const definesInFile = this.findSymbolsDefinedInFile(edge.from);
        for (const symbol of definesInFile) {
          impacted.push({ impactedSymbolId: symbol.symbolId, relationship: 'calledBy' });
        }
      }

      if (edge.kind === 'IMPLEMENTS' && edge.to === target.id) {
        const implSymbol = this.getSymbolNode(edge.from);
        if (implSymbol) {
          impacted.push({ impactedSymbolId: implSymbol.symbolId, relationship: 'implements' });
        }
      }

      if (edge.kind === 'INHERITS_FROM' && edge.to === target.id) {
        const implSymbol = this.getSymbolNode(edge.from);
        if (implSymbol) {
          impacted.push({ impactedSymbolId: implSymbol.symbolId, relationship: 'overriddenBy' });
        }
      }
    }

    const stale = this.isSymbolStale(
      target,
      impacted.map((item) => item.impactedSymbolId),
    );
    return { impacted: dedupeImpact(impacted), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findSimilarImplementations(symbolId: string): Promise<SimilarImplementationResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { similar: [], stale: false };

    const similar: SimilarImplementationResult['similar'] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind === 'IMPLEMENTS' && edge.to === target.id) {
        const impl = this.getSymbolNode(edge.from);
        if (impl) {
          similar.push({
            implementationId: impl.symbolId,
            relationKind: 'implementsSameInterface',
          });
        }
      }

      if (edge.kind === 'INHERITS_FROM' && edge.to === target.id) {
        const impl = this.getSymbolNode(edge.from);
        if (impl) {
          similar.push({ implementationId: impl.symbolId, relationKind: 'extendsSameBase' });
        }
      }
    }

    const stale = this.isSymbolStale(
      target,
      similar.map((item) => item.implementationId),
    );
    return { similar: sortBySimilar(similar), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getExternalDependencies(symbolId: string): Promise<ExternalDependencyResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { dependencies: [], stale: false };

    const dependenciesByPackage = new Map<
      string,
      { packageName: string; version: string; symbols: Set<string> }
    >();
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'REFERS_TO') continue;
      const refers = edge as RefersToEdge;
      const symbol = this.getSymbolNode(refers.to);
      if (!symbol) continue;
      if (symbol.packageName === target.packageName) continue;
      const key = `${symbol.packageName}@${symbol.version}`;
      const entry = dependenciesByPackage.get(key) ?? {
        packageName: symbol.packageName,
        version: symbol.version,
        symbols: new Set<string>(),
      };
      entry.symbols.add(symbol.symbolId);
      dependenciesByPackage.set(key, entry);
    }

    const dependencies = [...dependenciesByPackage.values()]
      .map((entry) => ({
        packageName: entry.packageName,
        version: entry.version,
        symbols: [...entry.symbols].sort(),
      }))
      .sort((a, b) =>
        `${a.packageName}@${a.version}`.localeCompare(`${b.packageName}@${b.version}`),
      );

    const stale = this.isSymbolStale(target, []);
    return { dependencies, stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getTestsForSymbol(symbolId: string): Promise<TestsForSymbolResult> {
    const target = this.findSymbolBySymbolId(symbolId);
    if (!target) return { tests: [], untestedPaths: [], stale: false };

    const tests: TestsForSymbolResult['tests'] = [];
    const definitionFiles = this.findDefinitionFiles(target.id);

    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'REFERS_TO') continue;
      if (edge.to !== target.id) continue;
      const file = this.getFileNode(edge.from);
      if (!file) continue;
      if (!isTestFile(file.path)) continue;
      const refers = edge as RefersToEdge;
      tests.push({
        testFileId: file.fileId,
        testSymbolId: null,
        range: refers.range,
        coverageKind: 'direct',
      });
    }

    const coveredFiles = new Set(tests.map((test) => test.testFileId));
    const untestedPaths = definitionFiles
      .filter((file) => !coveredFiles.has(file.fileId))
      .map((file) => ({ fileId: file.fileId, reason: 'not referenced in any test' }))
      .sort((a, b) => a.fileId.localeCompare(b.fileId));

    const stale = this.isSymbolStale(
      target,
      definitionFiles.map((file) => file.fileId),
    );
    return { tests: sortByTests(tests), untestedPaths, stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getRequiredModifications(featureInterfaceId: string): Promise<RequiredModificationsResult> {
    const target = this.findSymbolBySymbolId(featureInterfaceId);
    if (!target) return { touchPoints: [], stale: false };

    const touchPoints: RequiredModificationsResult['touchPoints'] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind === 'IMPLEMENTS' && edge.to === target.id) {
        const impl = this.getSymbolNode(edge.from);
        if (!impl) continue;
        touchPoints.push({ symbolId: impl.symbolId, reason: 'implementInterface' });
      }
    }

    const stale = this.isSymbolStale(
      target,
      touchPoints.map((touch) => touch.symbolId),
    );
    return { touchPoints: sortByTouchPoints(touchPoints), stale };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getArchitecturalConstraints(_symbolId: string): Promise<ArchitecturalConstraintsResult> {
    return { constraints: [], stale: false };
  }

  private findSymbolBySymbolId(symbolId: string): SymbolNode | undefined {
    return this.store
      .listNodes()
      .filter((node): node is SymbolNode => node.kind === 'Symbol')
      .find((symbol: SymbolNode) => symbol.symbolId === symbolId);
  }

  private getSymbolNode(id: string): SymbolNode | undefined {
    const node = this.store.getNode(id);
    return node && node.kind === 'Symbol' ? node : undefined;
  }

  private getTypeNode(id: string): TypeNode | undefined {
    const node = this.store.getNode(id);
    return node && node.kind === 'Type' ? node : undefined;
  }

  private getFileNode(id: string): FileNode | undefined {
    const node = this.store.getNode(id);
    return node && node.kind === 'File' ? node : undefined;
  }

  private findRefersToEdges(
    symbolNodeId: string,
    includeTypes: boolean,
  ): Array<{ fileId: string; range: Range; referenceKind: 'call' | 'read' | 'write' | 'type' }> {
    const references: Array<{
      fileId: string;
      range: Range;
      referenceKind: 'call' | 'read' | 'write' | 'type';
    }> = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'REFERS_TO') continue;
      const refers = edge as RefersToEdge;
      if (refers.to !== symbolNodeId) continue;
      if (!includeTypes && refers.referenceKind === 'type') continue;
      const file = this.getFileNode(refers.from);
      if (!file) continue;
      references.push({
        fileId: file.fileId,
        range: refers.range,
        referenceKind: refers.referenceKind,
      });
    }
    return references;
  }

  private findDefinitionFiles(symbolNodeId: string): FileNode[] {
    const files: FileNode[] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'DEFINES') continue;
      const defines = edge as DefinesEdge;
      if (defines.to !== symbolNodeId) continue;
      const file = this.getFileNode(defines.from);
      if (file) files.push(file);
    }
    return files;
  }

  private findDefinitionLocation(symbolNodeId: string): { fileId: string; range: Range } {
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'DEFINES') continue;
      const defines = edge as DefinesEdge;
      if (defines.to !== symbolNodeId) continue;
      const file = this.getFileNode(defines.from);
      if (!file) continue;
      return { fileId: file.fileId, range: defines.range };
    }

    return {
      fileId: 'unknown',
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 0 },
    };
  }

  private findSymbolsDefinedInFile(fileNodeId: string): SymbolNode[] {
    const symbols: SymbolNode[] = [];
    for (const edge of this.store.getEdges()) {
      if (edge.kind !== 'DEFINES') continue;
      const defines = edge as DefinesEdge;
      if (defines.from !== fileNodeId) continue;
      const symbol = this.getSymbolNode(defines.to);
      if (symbol) symbols.push(symbol);
    }
    return symbols;
  }

  private isSymbolStale(symbol: SymbolNode, fileIds: string[]): boolean {
    if (symbol.stale) return true;
    for (const node of this.store.listNodes()) {
      if (node.kind === 'File' && fileIds.includes(node.fileId)) {
        if (node.stale) return true;
      }
    }
    return false;
  }
}

function dedupeDependencies(
  dependencies: DependencyResult['dependencies'],
): DependencyResult['dependencies'] {
  const seen = new Set<string>();
  const result: DependencyResult['dependencies'] = [];
  for (const dep of dependencies) {
    const key = `${dep.targetSymbolId}:${dep.relationship}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(dep);
  }
  return result.sort((a, b) =>
    `${a.relationship}:${a.targetSymbolId}`.localeCompare(`${b.relationship}:${b.targetSymbolId}`),
  );
}

function dedupeImpact(impacted: ImpactResult['impacted']): ImpactResult['impacted'] {
  const seen = new Set<string>();
  const result: ImpactResult['impacted'] = [];
  for (const item of impacted) {
    const key = `${item.impactedSymbolId}:${item.relationship}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.sort((a, b) =>
    `${a.relationship}:${a.impactedSymbolId}`.localeCompare(
      `${b.relationship}:${b.impactedSymbolId}`,
    ),
  );
}

function sortByReference(references: ReferenceResult['references']): ReferenceResult['references'] {
  return references.sort((a, b) =>
    `${a.fileId}:${rangeKey(a.range)}:${a.referenceKind}`.localeCompare(
      `${b.fileId}:${rangeKey(b.range)}:${b.referenceKind}`,
    ),
  );
}

function sortByDefinition(
  definitions: DefinitionResult['definitions'],
): DefinitionResult['definitions'] {
  return definitions.sort((a, b) =>
    `${a.fileId}:${rangeKey(a.range)}:${a.definitionKind}`.localeCompare(
      `${b.fileId}:${rangeKey(b.range)}:${b.definitionKind}`,
    ),
  );
}

function sortByImplementation(
  implementations: ImplementationResult['implementations'],
): ImplementationResult['implementations'] {
  return implementations.sort((a, b) =>
    `${a.implementationId}:${a.fileId}:${rangeKey(a.range)}`.localeCompare(
      `${b.implementationId}:${b.fileId}:${rangeKey(b.range)}`,
    ),
  );
}

function sortBySimilar(
  similar: SimilarImplementationResult['similar'],
): SimilarImplementationResult['similar'] {
  return similar.sort((a, b) =>
    `${a.relationKind}:${a.implementationId}`.localeCompare(
      `${b.relationKind}:${b.implementationId}`,
    ),
  );
}

function sortByTests(tests: TestsForSymbolResult['tests']): TestsForSymbolResult['tests'] {
  return tests.sort((a, b) =>
    `${a.testFileId}:${rangeKey(a.range)}`.localeCompare(`${b.testFileId}:${rangeKey(b.range)}`),
  );
}

function sortByTouchPoints(
  touchPoints: RequiredModificationsResult['touchPoints'],
): RequiredModificationsResult['touchPoints'] {
  return touchPoints.sort((a, b) => a.symbolId.localeCompare(b.symbolId));
}

function rangeKey(range: Range): string {
  if (range.range_kind === 'line_col') {
    return `${range.start_line}:${range.start_col}:${range.end_line}:${range.end_col}`;
  }
  if (range.range_kind === 'byte_offset') {
    return `${range.start_byte}:${range.end_byte}`;
  }
  if (range.range_kind === 'dom') {
    return `${range.selector}:${range.start_offset ?? 0}:${range.end_offset ?? 0}`;
  }
  return range.pointer;
}

function isTestFile(pathname: string): boolean {
  return /\.(test|spec)\./.test(pathname) || /__tests__/.test(pathname);
}
