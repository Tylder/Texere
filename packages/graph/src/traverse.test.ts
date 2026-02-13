import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './db.js';
import { createEdge } from './edges.js';
import { invalidateNode, storeNode } from './nodes.js';
import { about, stats, traverse } from './traverse.js';
import { EdgeType, NodeType } from './types.js';

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
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const depth1 = storeNode(db, { type: NodeType.Solution, title: 'Depth1', content: 'Depth1' });
    const depth2 = storeNode(db, { type: NodeType.Problem, title: 'Depth2', content: 'Depth2' });
    const depth3 = storeNode(db, { type: NodeType.Technology, title: 'Depth3', content: 'Depth3' });

    createEdge(db, { source_id: start.id, target_id: depth1.id, type: EdgeType.Solves });
    createEdge(db, { source_id: depth1.id, target_id: depth2.id, type: EdgeType.Requires });
    createEdge(db, { source_id: depth2.id, target_id: depth3.id, type: EdgeType.BuildsOn });

    const result = traverse(db, { startId: start.id, direction: 'outgoing', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(depth1.id)).toBe(1);
    expect(depthById.get(depth2.id)).toBe(2);
    expect(depthById.has(depth3.id)).toBe(false);
  });

  it("follows incoming edges with traverse({ direction: 'incoming', maxDepth: 2 })", () => {
    const upstream2 = storeNode(db, { type: NodeType.Problem, title: 'Upstream2', content: 'U2' });
    const upstream1 = storeNode(db, { type: NodeType.Solution, title: 'Upstream1', content: 'U1' });
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });

    createEdge(db, { source_id: upstream1.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: upstream2.id, target_id: upstream1.id, type: EdgeType.Requires });

    const result = traverse(db, { startId: start.id, direction: 'incoming', maxDepth: 2 });
    const depthById = toDepthById(result);

    expect(depthById.get(upstream1.id)).toBe(1);
    expect(depthById.get(upstream2.id)).toBe(2);
  });

  it("follows both directions with traverse({ direction: 'both', maxDepth: 2 })", () => {
    const incoming = storeNode(db, {
      type: NodeType.Problem,
      title: 'Incoming',
      content: 'Incoming',
    });
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const outgoing = storeNode(db, {
      type: NodeType.Solution,
      title: 'Outgoing',
      content: 'Outgoing',
    });

    createEdge(db, { source_id: incoming.id, target_id: start.id, type: EdgeType.Causes });
    createEdge(db, { source_id: start.id, target_id: outgoing.id, type: EdgeType.Solves });

    const result = traverse(db, { startId: start.id, direction: 'both', maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(incoming.id)).toBe(true);
    expect(ids.has(outgoing.id)).toBe(true);
  });

  it('respects maxDepth and excludes nodes beyond it', () => {
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const d1 = storeNode(db, { type: NodeType.Solution, title: 'D1', content: 'D1' });
    const d2 = storeNode(db, { type: NodeType.Solution, title: 'D2', content: 'D2' });
    const d3 = storeNode(db, { type: NodeType.Solution, title: 'D3', content: 'D3' });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.Solves });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.Solves });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.Solves });

    const result = traverse(db, { startId: start.id, maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(false);
  });

  it('excludes invalidated nodes from traversal output', () => {
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const active = storeNode(db, { type: NodeType.Solution, title: 'Active', content: 'Active' });
    const invalidated = storeNode(db, {
      type: NodeType.Problem,
      title: 'Invalidated',
      content: 'Invalidated',
    });

    createEdge(db, { source_id: start.id, target_id: active.id, type: EdgeType.Solves });
    createEdge(db, { source_id: active.id, target_id: invalidated.id, type: EdgeType.Requires });
    invalidateNode(db, invalidated.id);

    const result = traverse(db, { startId: start.id, maxDepth: 3 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(active.id)).toBe(true);
    expect(ids.has(invalidated.id)).toBe(false);
  });

  it('returns empty for nonexistent start node', () => {
    const result = traverse(db, { startId: 'missing-node-id' });
    expect(result).toEqual([]);
  });

  it('returns empty when start node has no edges', () => {
    const lonely = storeNode(db, { type: NodeType.Decision, title: 'Lonely', content: 'Lonely' });
    const result = traverse(db, { startId: lonely.id });
    expect(result).toEqual([]);
  });

  it('handles cycles without infinite recursion via depth limit', () => {
    const a = storeNode(db, { type: NodeType.Decision, title: 'A', content: 'A' });
    const b = storeNode(db, { type: NodeType.Decision, title: 'B', content: 'B' });
    const c = storeNode(db, { type: NodeType.Decision, title: 'C', content: 'C' });

    createEdge(db, { source_id: a.id, target_id: b.id, type: EdgeType.RelatedTo });
    createEdge(db, { source_id: b.id, target_id: c.id, type: EdgeType.RelatedTo });
    createEdge(db, { source_id: c.id, target_id: a.id, type: EdgeType.RelatedTo });

    const result = traverse(db, { startId: a.id, direction: 'outgoing', maxDepth: 4 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(b.id)).toBe(true);
    expect(ids.has(c.id)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('applies edge type filter when provided', () => {
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const solves = storeNode(db, { type: NodeType.Solution, title: 'Solves', content: 'Solves' });
    const causes = storeNode(db, { type: NodeType.Problem, title: 'Causes', content: 'Causes' });

    createEdge(db, { source_id: start.id, target_id: solves.id, type: EdgeType.Solves });
    createEdge(db, { source_id: start.id, target_id: causes.id, type: EdgeType.Causes });

    const result = traverse(db, { startId: start.id, edgeType: EdgeType.Solves, maxDepth: 2 });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(solves.id)).toBe(true);
    expect(ids.has(causes.id)).toBe(false);
  });

  it('uses default maxDepth of 3 when maxDepth is omitted', () => {
    const start = storeNode(db, { type: NodeType.Decision, title: 'Start', content: 'Start' });
    const d1 = storeNode(db, { type: NodeType.Decision, title: 'D1', content: 'D1' });
    const d2 = storeNode(db, { type: NodeType.Decision, title: 'D2', content: 'D2' });
    const d3 = storeNode(db, { type: NodeType.Decision, title: 'D3', content: 'D3' });
    const d4 = storeNode(db, { type: NodeType.Decision, title: 'D4', content: 'D4' });

    createEdge(db, { source_id: start.id, target_id: d1.id, type: EdgeType.RelatedTo });
    createEdge(db, { source_id: d1.id, target_id: d2.id, type: EdgeType.RelatedTo });
    createEdge(db, { source_id: d2.id, target_id: d3.id, type: EdgeType.RelatedTo });
    createEdge(db, { source_id: d3.id, target_id: d4.id, type: EdgeType.RelatedTo });

    const result = traverse(db, { startId: start.id, direction: 'outgoing' });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(d1.id)).toBe(true);
    expect(ids.has(d2.id)).toBe(true);
    expect(ids.has(d3.id)).toBe(true);
    expect(ids.has(d4.id)).toBe(false);
  });

  it('caps maxDepth at 5 when input exceeds limit', () => {
    const nodes = Array.from({ length: 7 }, (_, idx) =>
      storeNode(db, { type: NodeType.Decision, title: `N${idx}`, content: `N${idx}` }),
    );

    for (let idx = 0; idx < nodes.length - 1; idx += 1) {
      createEdge(db, {
        source_id: nodes[idx]!.id,
        target_id: nodes[idx + 1]!.id,
        type: EdgeType.RelatedTo,
      });
    }

    const result = traverse(db, { startId: nodes[0]!.id, maxDepth: 99 });
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

  it('finds seed nodes via FTS and traverses neighbors', () => {
    const seed = storeNode(db, {
      type: NodeType.Technology,
      title: 'SQLite recursion',
      content: 'Recursive CTE patterns',
      tags: ['sqlite'],
    });
    const neighbor = storeNode(db, {
      type: NodeType.Decision,
      title: 'Use CTE traversal',
      content: 'Decision referencing SQLite',
    });

    createEdge(db, { source_id: seed.id, target_id: neighbor.id, type: EdgeType.BuildsOn });

    const result = about(db, { query: 'SQLite', maxDepth: 2, direction: 'outgoing' });
    const ids = new Set(result.map((row) => row.node.id));

    expect(ids.has(seed.id)).toBe(true);
    expect(ids.has(neighbor.id)).toBe(true);
  });

  it('returns search + traversal nodes deduplicated by id', () => {
    const seed = storeNode(db, {
      type: NodeType.Technology,
      title: 'SQLite search seed',
      content: 'SQLite',
      tags: ['sqlite'],
    });
    const matchingNeighbor = storeNode(db, {
      type: NodeType.Decision,
      title: 'SQLite neighbor',
      content: 'SQLite usage',
    });

    createEdge(db, {
      source_id: seed.id,
      target_id: matchingNeighbor.id,
      type: EdgeType.RelatedTo,
    });

    const result = about(db, { query: 'SQLite', maxDepth: 2 });
    const ids = result.map((row) => row.node.id);
    const unique = new Set(ids);

    expect(unique.has(seed.id)).toBe(true);
    expect(unique.has(matchingNeighbor.id)).toBe(true);
    expect(ids.length).toBe(unique.size);
  });

  it('returns empty when search finds no seed nodes', () => {
    storeNode(db, { type: NodeType.Decision, title: 'Unrelated', content: 'No sqlite here' });
    const result = about(db, { query: 'nonexistentqueryterm' });
    expect(result).toEqual([]);
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
    const decision = storeNode(db, {
      type: NodeType.Decision,
      title: 'Decision',
      content: 'Decision',
    });
    const problem = storeNode(db, { type: NodeType.Problem, title: 'Problem', content: 'Problem' });
    const solution = storeNode(db, {
      type: NodeType.Solution,
      title: 'Solution',
      content: 'Solution',
    });

    createEdge(db, { source_id: decision.id, target_id: solution.id, type: EdgeType.Solves });
    createEdge(db, { source_id: problem.id, target_id: decision.id, type: EdgeType.Causes });

    invalidateNode(db, problem.id);

    expect(stats(db)).toEqual({
      nodes: {
        total: 3,
        byType: {
          [NodeType.Decision]: 1,
          [NodeType.Problem]: 1,
          [NodeType.Solution]: 1,
        },
        invalidated: 1,
      },
      edges: {
        total: 2,
        byType: {
          [EdgeType.Solves]: 1,
          [EdgeType.Causes]: 1,
        },
      },
    });
  });
});
