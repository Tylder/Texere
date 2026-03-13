/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { invalidateNode, storeNode } from './nodes.js';
import { about, stats, traverse } from './traverse.js';
import { EdgeType, NodeRole, NodeType } from './types.js';

const traverseResults = (db: Database.Database, options: Parameters<typeof traverse>[1]) =>
  traverse(db, options).results;

const aboutResults = async (db: Database.Database, options: Parameters<typeof about>[1]) =>
  (await about(db, options)).results;

const collectTraversePages = (db: Database.Database, options: Parameters<typeof traverse>[1]) => {
  const all: ReturnType<typeof traverse>['results'] = [];
  let cursor = options.cursor;

  while (true) {
    const page = traverse(db, {
      ...options,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.results);
    if (!page.page.hasMore || !page.page.nextCursor) {
      return all;
    }
    cursor = page.page.nextCursor;
  }
};

const collectAboutPages = async (db: Database.Database, options: Parameters<typeof about>[1]) => {
  const all: Awaited<ReturnType<typeof about>>['results'] = [];
  let cursor = options.cursor;

  while (true) {
    const page = await about(db, {
      ...options,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.results);
    if (!page.page.hasMore || !page.page.nextCursor) {
      return all;
    }
    cursor = page.page.nextCursor;
  }
};

const makeNode = (
  db: Database.Database,
  opts: { type: NodeType; role: NodeRole; title: string; content: string; tags?: string[] },
) => storeNode(db, opts);
const toDepthById = (rows: Array<{ node: { id: string }; depth: number }>): Map<string, number> =>
  new Map(rows.map((row) => [row.node.id, row.depth]));

describe('traverse', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it("follows outgoing edges with traverse({ direction: 'outgoing', maxDepth: 2 })", () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const depth1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1',
      content: 'Depth1',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Depth2',
      content: 'Depth2',
    });
    const depth3 = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'Depth3',
      content: 'Depth3',
    });

    createEdge(db, { source_id: start.id, target_id: depth1.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: depth1.id, target_id: depth2.id, type: EdgeType.DependsOn });
    createEdge(db, { source_id: depth2.id, target_id: depth3.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: start.id, direction: 'outgoing', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(depth1.id)).toBe(1);
    expect(depthById.get(depth2.id)).toBe(2);
    expect(depthById.has(depth3.id)).toBe(false);
  });

  it("follows incoming edges with traverse({ direction: 'incoming', maxDepth: 2 })", () => {
    const upstream2 = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Upstream2',
      content: 'U2',
    });
    const upstream1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Upstream1',
      content: 'U1',
    });
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });

    createEdge(db, { source_id: upstream1.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: upstream2.id, target_id: upstream1.id, type: EdgeType.DependsOn });

    const result = traverseResults(db, { startId: start.id, direction: 'incoming', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(upstream1.id)).toBe(1);
    expect(depthById.get(upstream2.id)).toBe(2);
  });

  it("follows both directions with traverse({ direction: 'both', maxDepth: 2 })", () => {
    const incoming = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Incoming',
      content: 'Incoming',
    });
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const outgoing = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Outgoing',
      content: 'Outgoing',
    });

    createEdge(db, { source_id: incoming.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: start.id, target_id: outgoing.id, type: EdgeType.Resolves });

    const result = traverseResults(db, { startId: start.id, direction: 'both', maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(incoming.id)).toBe(true);
    expect(ids.has(outgoing.id)).toBe(true);
  });

  it('respects maxDepth and excludes nodes beyond it', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const d1 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D1',
      content: 'D1',
    });
    const d2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D2',
      content: 'D2',
    });
    const d3 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'D3',
      content: 'D3',
    });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.Resolves });

    const result = traverseResults(db, { startId: start.id, maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(false);
  });

  it('excludes invalidated nodes from traversal output', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const active = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Active',
      content: 'Active',
    });
    const invalidated = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Invalidated',
      content: 'Invalidated',
    });

    createEdge(db, { source_id: start.id, target_id: active.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: active.id, target_id: invalidated.id, type: EdgeType.DependsOn });
    invalidateNode(db, invalidated.id);

    const result = traverseResults(db, { startId: start.id, maxDepth: 3 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(active.id)).toBe(true);
    expect(ids.has(invalidated.id)).toBe(false);
  });

  it('returns empty for nonexistent start node', () => {
    const result = traverseResults(db, { startId: 'missing-node-id' });
    expect(result).toEqual([]);
  });

  it('returns empty when start node has no edges', () => {
    const lonely = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Lonely',
      content: 'Lonely',
    });
    const result = traverseResults(db, { startId: lonely.id });
    expect(result).toEqual([]);
  });

  it('handles cycles without infinite recursion via depth limit', () => {
    const a = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'A',
      content: 'A',
    });
    const b = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'B',
      content: 'B',
    });
    const c = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'C',
      content: 'C',
    });

    createEdge(db, { source_id: a.id, target_id: b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: b.id, target_id: c.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: c.id, target_id: a.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: a.id, direction: 'outgoing', maxDepth: 4 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(b.id)).toBe(true);
    expect(ids.has(c.id)).toBe(true);
    expect(ids.has(a.id)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('applies edge type filter when provided', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const solves = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Solves',
      content: 'Solves',
    });
    const causes = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Causes',
      content: 'Causes',
    });

    createEdge(db, { source_id: start.id, target_id: solves.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: start.id, target_id: causes.id, type: EdgeType.Causes });

    const result = traverseResults(db, {
      startId: start.id,
      edgeType: EdgeType.Resolves,
      maxDepth: 2,
    });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(solves.id)).toBe(true);
    expect(ids.has(causes.id)).toBe(false);
  });

  it('uses default maxDepth of 3 when maxDepth is omitted', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Start',
      content: 'Start',
    });
    const d1 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D1',
      content: 'D1',
    });
    const d2 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D2',
      content: 'D2',
    });
    const d3 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D3',
      content: 'D3',
    });
    const d4 = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'D4',
      content: 'D4',
    });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: d3.id, target_id: d4.id, type: EdgeType.BasedOn });

    const result = traverseResults(db, { startId: start.id, direction: 'outgoing' });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(true);
    expect(ids.has(d4.id)).toBe(false);
  });

  it('caps maxDepth at 5 when input exceeds limit', () => {
    const nodes = Array.from({ length: 7 }, (_, idx) =>
      makeNode(db, {
        type: NodeType.Knowledge,
        role: NodeRole.Decision,
        title: `N${idx}`,
        content: `N${idx}`,
      }),
    );

    for (let idx = 0; idx < nodes.length - 1; idx += 1) {
      createEdge(db, {
        source_id: nodes[idx]!.id,
        target_id: nodes[idx + 1]!.id,
        type: EdgeType.BasedOn,
      });
    }

    const result = traverseResults(db, { startId: nodes[0]!.id, maxDepth: 99 });
    const depthById = toDepthById(result);

    expect(depthById.get(nodes[5]!.id)).toBe(5);
    expect(depthById.has(nodes[6]!.id)).toBe(false);
  });
});

describe('about', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('finds seed nodes via FTS and traverses neighbors', async () => {
    const seed = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'SQLite recursion',
      content: 'Recursive CTE patterns',
      tags: ['sqlite'],
    });
    const neighbor = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Use CTE traversal',
      content: 'Decision referencing SQLite',
    });

    createEdge(db, { source_id: seed.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const result = await aboutResults(db, { query: 'SQLite', maxDepth: 2, direction: 'outgoing' });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(seed.id)).toBe(true);
    expect(ids.has(neighbor.id)).toBe(true);
  });

  it('returns search + traversal nodes deduplicated by id', async () => {
    const seed = makeNode(db, {
      type: NodeType.Artifact,
      role: NodeRole.Technology,
      title: 'SQLite search seed',
      content: 'SQLite',
      tags: ['sqlite'],
    });
    const matchingNeighbor = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'SQLite neighbor',
      content: 'SQLite usage',
    });

    createEdge(db, {
      source_id: seed.id,
      target_id: matchingNeighbor.id,
      type: EdgeType.BasedOn,
    });

    const result = await aboutResults(db, { query: 'SQLite', maxDepth: 2 });
    const ids = result.map((row) => row.node.id);
    const unique = new Set(ids);

    expect(unique.has(seed.id)).toBe(true);
    expect(unique.has(matchingNeighbor.id)).toBe(true);
    expect(ids.length).toBe(unique.size);
  });

  it('returns empty when search finds no seed nodes', async () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Unrelated',
      content: 'No sqlite here',
    });
    const result = await aboutResults(db, { query: 'nonexistentqueryterm' });
    expect(result).toEqual([]);
  });

  it('paginates traverse results with stable ordering', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Pagination start',
      content: 'root',
    });
    const depth1a = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1a',
      content: 'one',
    });
    const depth1b = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth1b',
      content: 'two',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Depth2',
      content: 'three',
    });

    createEdge(db, { source_id: start.id, target_id: depth1a.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: depth1b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: depth1a.id, target_id: depth2.id, type: EdgeType.BasedOn });

    const page1 = traverse(db, { startId: start.id, limit: 2 });
    const page2 = traverse(db, { startId: start.id, limit: 2, cursor: page1.page.nextCursor! });

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.node.id));
    expect(ids.size).toBe(3);
    expect(page1.page.hasMore).toBe(true);
    expect(page2.page.hasMore).toBe(false);
  });

  it('returns no traversal rows at maxDepth 0', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Depth zero start',
      content: 'root',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Neighbor',
      content: 'one hop',
    });

    createEdge(db, { source_id: start.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const page = traverse(db, { startId: start.id, maxDepth: 0 });
    expect(page.results).toEqual([]);
    expect(page.page.hasMore).toBe(false);
  });

  it('rejects malformed traverse cursors', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse bad cursor start',
      content: 'root',
    });

    expect(() => traverse(db, { startId: start.id, cursor: 'not-a-cursor' })).toThrow(
      'Invalid cursor',
    );
  });

  it('rejects traverse cursors when request scope changes', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse scope start',
      content: 'root',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse scope neighbor',
      content: 'one hop',
    });
    const otherNeighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse scope other neighbor',
      content: 'second hop peer',
    });

    createEdge(db, { source_id: start.id, target_id: neighbor.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: otherNeighbor.id, type: EdgeType.BasedOn });

    const firstPage = traverse(db, { startId: start.id, direction: 'outgoing', limit: 1 });
    expect(firstPage.page.hasMore).toBe(true);

    expect(() =>
      traverse(db, {
        startId: start.id,
        direction: 'incoming',
        limit: 1,
        cursor: firstPage.page.nextCursor!,
      }),
    ).toThrow('Cursor does not match the current request');
  });

  it('matches single large-page results when collecting all traverse pages', () => {
    const start = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Traverse roundtrip start',
      content: 'root',
    });
    const depth1a = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip a',
      content: 'a',
    });
    const depth1b = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip b',
      content: 'b',
    });
    const depth2 = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Traverse roundtrip c',
      content: 'c',
    });

    createEdge(db, { source_id: start.id, target_id: depth1a.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: start.id, target_id: depth1b.id, type: EdgeType.BasedOn });
    createEdge(db, { source_id: depth1a.id, target_id: depth2.id, type: EdgeType.BasedOn });

    const allPaged = collectTraversePages(db, { startId: start.id, limit: 1 });
    const singlePage = traverse(db, { startId: start.id, limit: 10 });

    expect(allPaged.map((row) => row.node.id)).toEqual(
      singlePage.results.map((row) => row.node.id),
    );
  });

  it('paginates about results after deduplication', async () => {
    const seedA = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth timeout A',
      content: 'timeout details',
    });
    const seedB = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth timeout B',
      content: 'timeout details',
    });
    const shared = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Shared solution',
      content: 'use longer retry window',
    });

    createEdge(db, { source_id: seedA.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: seedB.id, target_id: shared.id, type: EdgeType.Resolves });

    const page1 = await about(db, { query: 'timeout', direction: 'both', maxDepth: 2, limit: 2 });
    const page2 = await about(db, {
      query: 'timeout',
      direction: 'both',
      maxDepth: 2,
      limit: 2,
      cursor: page1.page.nextCursor!,
    });

    const ids = new Set([...page1.results, ...page2.results].map((row) => row.node.id));
    expect(ids.has(shared.id)).toBe(true);
    expect(ids.size).toBe(3);
  });

  it('keeps only seeds when about maxDepth is 0', async () => {
    const seed = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Auth zero depth seed only',
      content: 'seed-only lookup',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Zero depth neighbor',
      content: 'use longer retry window',
    });

    createEdge(db, { source_id: seed.id, target_id: neighbor.id, type: EdgeType.Resolves });

    const page = await about(db, { query: 'seed-only', maxDepth: 0 });
    expect(page.results.some((row) => row.depth > 0)).toBe(false);
    expect(page.results.map((row) => row.node.id)).toContain(seed.id);
  });

  it('rejects malformed about cursors', () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Timeout cursor seed',
      content: 'timeout details',
    });

    expect(() => about(db, { query: 'timeout', cursor: 'not-a-cursor' })).toThrow('Invalid cursor');
  });

  it('rejects about cursors when request scope changes', async () => {
    makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About scope seed',
      content: 'timeout details',
    });
    makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About scope solution',
      content: 'timeout solution',
    });

    const firstPage = await about(db, { query: 'timeout', direction: 'outgoing', limit: 1 });

    expect(() =>
      about(db, {
        query: 'timeout',
        direction: 'incoming',
        limit: 1,
        cursor: firstPage.page.nextCursor!,
      }),
    ).toThrow('Cursor does not match the current request');
  });

  it('matches single large-page results when collecting all about pages', async () => {
    const seedA = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About roundtrip seed A',
      content: 'about roundtrip timeout',
    });
    const seedB = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'About roundtrip seed B',
      content: 'about roundtrip timeout',
    });
    const shared = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About roundtrip shared',
      content: 'shared remedy',
    });
    const neighbor = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'About roundtrip neighbor',
      content: 'neighbor remedy',
    });

    createEdge(db, { source_id: seedA.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: seedB.id, target_id: shared.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: shared.id, target_id: neighbor.id, type: EdgeType.BasedOn });

    const allPaged = await collectAboutPages(db, {
      query: 'about roundtrip timeout',
      direction: 'both',
      maxDepth: 2,
      limit: 1,
    });
    const ids = allPaged.map((row) => row.node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set([seedA.id, seedB.id, shared.id, neighbor.id]));
  });
});

describe('stats', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('returns node and edge totals plus by-type breakdowns and invalidated count', () => {
    const decision = makeNode(db, {
      type: NodeType.Knowledge,
      role: NodeRole.Decision,
      title: 'Decision',
      content: 'Decision',
    });
    const problem = makeNode(db, {
      type: NodeType.Issue,
      role: NodeRole.Problem,
      title: 'Problem',
      content: 'Problem',
    });
    const solution = makeNode(db, {
      type: NodeType.Action,
      role: NodeRole.Solution,
      title: 'Solution',
      content: 'Solution',
    });

    createEdge(db, { source_id: decision.id, target_id: solution.id, type: EdgeType.Resolves });
    createEdge(db, { source_id: problem.id, target_id: decision.id, type: EdgeType.Causes });

    invalidateNode(db, problem.id);

    expect(stats(db)).toEqual({
      nodes: {
        total: 3,
        byType: {
          [NodeType.Knowledge]: 1,
          [NodeType.Issue]: 1,
          [NodeType.Action]: 1,
        },
        invalidated: 1,
      },
      edges: {
        total: 2,
        byType: {
          [EdgeType.Resolves]: 1,
          [EdgeType.Causes]: 1,
        },
      },
    });
  });
});
