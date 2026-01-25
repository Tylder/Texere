import { describe, expect, it } from 'vitest';

import { createDeterministicId, type FileNode, type SymbolNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { InMemoryGraphQueryService } from './index.js';

describe('InMemoryGraphQueryService', () => {
  it('returns definitions and references deterministically', async () => {
    const store = new InMemoryGraphStore();

    const fileId = createDeterministicId('file:one');
    const symbolId = 'symbol:example';
    const symbolNodeId = createDeterministicId(`${symbolId}:pkg:0.0.0`);

    const file: FileNode = {
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'src/example.txt',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    };

    const symbol: SymbolNode = {
      id: symbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    };

    store.putNode(file);
    store.putNode(symbol);
    store.putEdge({
      id: createDeterministicId('defines'),
      kind: 'DEFINES',
      schema_version: 'v0.1',
      from: fileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 5 },
      definitionKind: 'definition',
    });
    store.putEdge({
      id: createDeterministicId('refers'),
      kind: 'REFERS_TO',
      schema_version: 'v0.1',
      from: fileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 6, end_byte: 10 },
      referenceKind: 'read',
    });

    const service = new InMemoryGraphQueryService(store);
    const definitions = await service.getSymbolDefinition(symbolId);
    const references = await service.getSymbolReferences(symbolId);

    expect(definitions.definitions).toHaveLength(1);
    expect(definitions.definitions[0]?.fileId).toBe(file.fileId);
    expect(references.references).toHaveLength(1);
    expect(references.references[0]?.referenceKind).toBe('read');
  });

  it('detects test references and untested paths', async () => {
    const store = new InMemoryGraphStore();

    const srcFileId = createDeterministicId('file:src');
    const testFileId = createDeterministicId('file:test');
    const symbolId = 'symbol:subject';
    const symbolNodeId = createDeterministicId(`${symbolId}:pkg:0.0.0`);

    store.putNode({
      id: srcFileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId: srcFileId,
      path: 'src/source.txt',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    });

    store.putNode({
      id: testFileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId: testFileId,
      path: 'src/source.test.txt',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    });

    store.putNode({
      id: symbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    });

    store.putEdge({
      id: createDeterministicId('defines'),
      kind: 'DEFINES',
      schema_version: 'v0.1',
      from: srcFileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 5 },
      definitionKind: 'definition',
    });

    store.putEdge({
      id: createDeterministicId('refers-test'),
      kind: 'REFERS_TO',
      schema_version: 'v0.1',
      from: testFileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 6, end_byte: 10 },
      referenceKind: 'read',
    });

    const service = new InMemoryGraphQueryService(store);
    const result = await service.getTestsForSymbol(symbolId);

    expect(result.tests).toHaveLength(1);
    expect(result.untestedPaths).toHaveLength(1);
    expect(result.untestedPaths[0]?.fileId).toBe(srcFileId);
  });

  it('returns dependencies and impact data', async () => {
    const store = new InMemoryGraphStore();
    const fileId = createDeterministicId('file:dep');
    const symbolId = 'symbol:dep';
    const symbolNodeId = createDeterministicId(`${symbolId}:pkg:0.0.0`);
    const targetSymbolId = 'symbol:target';
    const targetSymbolNodeId = createDeterministicId(`${targetSymbolId}:pkg:0.0.0`);

    store.putNode({
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'src/dep.txt',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    });
    store.putNode({
      id: symbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    });
    store.putNode({
      id: targetSymbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: targetSymbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    });

    store.putEdge({
      id: createDeterministicId('defines-dep'),
      kind: 'DEFINES',
      schema_version: 'v0.1',
      from: fileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 1 },
      definitionKind: 'definition',
    });
    store.putEdge({
      id: createDeterministicId('refers-dep'),
      kind: 'REFERS_TO',
      schema_version: 'v0.1',
      from: fileId,
      to: targetSymbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 2, end_byte: 3 },
      referenceKind: 'call',
    });

    const service = new InMemoryGraphQueryService(store);
    const deps = await service.getSymbolDependencies(symbolId);
    const impact = await service.getImpactOfChange(targetSymbolId);

    expect(deps.dependencies).toEqual([{ targetSymbolId: targetSymbolId, relationship: 'call' }]);
    expect(impact.impacted).toEqual([{ impactedSymbolId: symbolId, relationship: 'calledBy' }]);
  });

  it('returns external dependencies grouped by package', async () => {
    const store = new InMemoryGraphStore();
    const fileId = createDeterministicId('file:external');
    const symbolId = 'symbol:local';
    const symbolNodeId = createDeterministicId(`${symbolId}:local:0.0.0`);
    const externalSymbolId = 'symbol:external';
    const externalSymbolNodeId = createDeterministicId(`${externalSymbolId}:ext:1.2.3`);

    store.putNode({
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'src/external.txt',
      packageName: 'local',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    });
    store.putNode({
      id: symbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'local',
      version: '0.0.0',
      stale: false,
    });
    store.putNode({
      id: externalSymbolNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: externalSymbolId,
      symbolKind: 'symbol',
      visibility: 'public',
      packageName: 'ext',
      version: '1.2.3',
      stale: false,
    });

    store.putEdge({
      id: createDeterministicId('defines-local'),
      kind: 'DEFINES',
      schema_version: 'v0.1',
      from: fileId,
      to: symbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 1 },
      definitionKind: 'definition',
    });
    store.putEdge({
      id: createDeterministicId('refers-external'),
      kind: 'REFERS_TO',
      schema_version: 'v0.1',
      from: fileId,
      to: externalSymbolNodeId,
      range: { range_kind: 'byte_offset', start_byte: 2, end_byte: 3 },
      referenceKind: 'read',
    });

    const service = new InMemoryGraphQueryService(store);
    const result = await service.getExternalDependencies(symbolId);

    expect(result.dependencies).toEqual([
      { packageName: 'ext', version: '1.2.3', symbols: [externalSymbolId] },
    ]);
  });

  it('returns implementations from implements edges', async () => {
    const store = new InMemoryGraphStore();
    const fileId = createDeterministicId('file:impl');
    const interfaceSymbolId = 'symbol:interface';
    const interfaceNodeId = createDeterministicId(`${interfaceSymbolId}:pkg:0.0.0`);
    const implSymbolId = 'symbol:implementation';
    const implNodeId = createDeterministicId(`${implSymbolId}:pkg:0.0.0`);

    store.putNode({
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'src/impl.txt',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'unknown',
      stale: false,
    });
    store.putNode({
      id: interfaceNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: interfaceSymbolId,
      symbolKind: 'interface',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    });
    store.putNode({
      id: implNodeId,
      kind: 'Symbol',
      schema_version: 'v0.1',
      symbolId: implSymbolId,
      symbolKind: 'class',
      visibility: 'public',
      packageName: 'pkg',
      version: '0.0.0',
      stale: false,
    });

    store.putEdge({
      id: createDeterministicId('defines-impl'),
      kind: 'DEFINES',
      schema_version: 'v0.1',
      from: fileId,
      to: implNodeId,
      range: { range_kind: 'byte_offset', start_byte: 0, end_byte: 1 },
      definitionKind: 'definition',
    });
    store.putEdge({
      id: createDeterministicId('implements'),
      kind: 'IMPLEMENTS',
      schema_version: 'v0.1',
      from: implNodeId,
      to: interfaceNodeId,
      relationKind: 'implements',
    });

    const service = new InMemoryGraphQueryService(store);
    const result = await service.getSymbolImplementations(interfaceSymbolId);

    expect(result.implementations).toHaveLength(1);
    expect(result.implementations[0]?.implementationId).toBe(implSymbolId);
  });
});
