import { describe, expect, it } from 'vitest';

import { createDeterministicId, type FileNode, type SymbolNode } from '@repo/graph-core';
import { InMemoryGraphStore } from '@repo/graph-store';

import { InMemoryGraphQueryService } from './index.js';

describe('InMemoryGraphQueryService', () => {
  it('returns definitions and references deterministically', async () => {
    const store = new InMemoryGraphStore();

    const fileId = createDeterministicId('file:one');
    const symbolId = 'scip-ts example symbol';
    const symbolNodeId = createDeterministicId(`${symbolId}:pkg:0.0.0`);

    const file: FileNode = {
      id: fileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId,
      path: 'src/index.ts',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'typescript',
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
    const symbolId = 'scip-ts example symbol';
    const symbolNodeId = createDeterministicId(`${symbolId}:pkg:0.0.0`);

    store.putNode({
      id: srcFileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId: srcFileId,
      path: 'src/index.ts',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'typescript',
      stale: false,
    });

    store.putNode({
      id: testFileId,
      kind: 'File',
      schema_version: 'v0.1',
      fileId: testFileId,
      path: 'src/index.test.ts',
      packageName: 'pkg',
      commitSha: 'commit',
      language: 'typescript',
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
});
