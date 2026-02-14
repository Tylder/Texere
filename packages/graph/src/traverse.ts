import type Database from 'better-sqlite3';

import { search } from './search.js';
import type { AboutOptions, EdgeType, Node, SearchOptions, TraverseOptions } from './types.js';

export type { AboutOptions } from './types.js';

type TraverseRow = Node & { depth: number };

export interface TraverseResult {
  node: Node;
  depth: number;
}

export interface Stats {
  nodes: {
    total: number;
    byType: Record<string, number>;
    invalidated: number;
  };
  edges: {
    total: number;
    byType: Record<string, number>;
  };
}

const DEFAULT_MAX_DEPTH = 3;
const MAX_DEPTH_CAP = 5;

const toMaxDepth = (maxDepth: number | undefined): number => {
  if (maxDepth === undefined) {
    return DEFAULT_MAX_DEPTH;
  }

  return Math.min(MAX_DEPTH_CAP, Math.max(0, Math.trunc(maxDepth)));
};

const getDirection = (
  direction: TraverseOptions['direction'],
): NonNullable<TraverseOptions['direction']> => direction ?? 'outgoing';

const toResults = (rows: TraverseRow[]): TraverseResult[] =>
  rows.map(({ depth, ...node }) => ({
    node,
    depth,
  }));

const buildWalkSql = (
  direction: NonNullable<TraverseOptions['direction']>,
  hasEdgeType: boolean,
): string => {
  const edgeTypeFilter = hasEdgeType ? 'AND e.type = @edgeType' : '';

  if (direction === 'incoming') {
    return `
      WITH RECURSIVE graph_walk(node_id, depth) AS (
        SELECT e.source_id, 1
        FROM edges e
        WHERE e.target_id = @startId
        ${edgeTypeFilter}

        UNION ALL

        SELECT e.source_id, gw.depth + 1
        FROM graph_walk gw
        JOIN edges e ON e.target_id = gw.node_id
        WHERE gw.depth < @maxDepth
        ${edgeTypeFilter}
      )
      SELECT
        n.id,
        n.type,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at,
        MIN(gw.depth) AS depth
      FROM graph_walk gw
      JOIN nodes n ON n.id = gw.node_id
      WHERE n.invalidated_at IS NULL
      GROUP BY
        n.id,
        n.type,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at
      ORDER BY depth ASC, n.created_at ASC
    `;
  }

  if (direction === 'both') {
    return `
      WITH RECURSIVE graph_walk(node_id, depth) AS (
        SELECT e.target_id, 1
        FROM edges e
        WHERE e.source_id = @startId
        ${edgeTypeFilter}

        UNION ALL

        SELECT e.source_id, 1
        FROM edges e
        WHERE e.target_id = @startId
        ${edgeTypeFilter}

        UNION ALL

        SELECT e.target_id, gw.depth + 1
        FROM graph_walk gw
        JOIN edges e ON e.source_id = gw.node_id
        WHERE gw.depth < @maxDepth
        ${edgeTypeFilter}

        UNION ALL

        SELECT e.source_id, gw.depth + 1
        FROM graph_walk gw
        JOIN edges e ON e.target_id = gw.node_id
        WHERE gw.depth < @maxDepth
        ${edgeTypeFilter}
      )
      SELECT
        n.id,
        n.type,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at,
        MIN(gw.depth) AS depth
      FROM graph_walk gw
      JOIN nodes n ON n.id = gw.node_id
      WHERE n.invalidated_at IS NULL
      GROUP BY
        n.id,
        n.type,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at
      ORDER BY depth ASC, n.created_at ASC
    `;
  }

  return `
    WITH RECURSIVE graph_walk(node_id, depth) AS (
      SELECT e.target_id, 1
      FROM edges e
      WHERE e.source_id = @startId
      ${edgeTypeFilter}

      UNION ALL

      SELECT e.target_id, gw.depth + 1
      FROM graph_walk gw
      JOIN edges e ON e.source_id = gw.node_id
      WHERE gw.depth < @maxDepth
      ${edgeTypeFilter}
    )
    SELECT
      n.id,
      n.type,
      n.title,
      n.content,
      n.tags_json,
      n.importance,
      n.confidence,
      n.created_at,
      n.invalidated_at,
      MIN(gw.depth) AS depth
    FROM graph_walk gw
    JOIN nodes n ON n.id = gw.node_id
    WHERE n.invalidated_at IS NULL
    GROUP BY
      n.id,
      n.type,
      n.title,
      n.content,
      n.tags_json,
      n.importance,
      n.confidence,
      n.created_at,
      n.invalidated_at
    ORDER BY depth ASC, n.created_at ASC
  `;
};

export const traverse = (db: Database.Database, options: TraverseOptions): TraverseResult[] => {
  const direction = getDirection(options.direction);
  const maxDepth = toMaxDepth(options.maxDepth);
  const hasEdgeType = options.edgeType !== undefined;
  const params: {
    startId: string;
    maxDepth: number;
    edgeType?: EdgeType;
  } = {
    startId: options.startId,
    maxDepth,
  };

  if (options.edgeType !== undefined) {
    params.edgeType = options.edgeType;
  }

  const sql = buildWalkSql(direction, hasEdgeType);
  const rows = db.prepare(sql).all(params) as TraverseRow[];
  return toResults(rows);
};

export const about = (
  db: Database.Database,
  options: AboutOptions,
  queryEmbedding?: Float32Array,
): TraverseResult[] => {
  const searchOptions: SearchOptions = { query: options.query };
  if (options.type !== undefined) {
    searchOptions.type = options.type;
  }
  if (options.tags !== undefined) {
    searchOptions.tags = options.tags;
  }
  if (options.minImportance !== undefined) {
    searchOptions.minImportance = options.minImportance;
  }
  if (options.limit !== undefined) {
    searchOptions.limit = options.limit;
  }
  if (options.tagMode !== undefined) {
    searchOptions.tagMode = options.tagMode;
  }
  if (options.role !== undefined) {
    searchOptions.role = options.role;
  }
  if (options.mode !== undefined) {
    searchOptions.mode = options.mode;
  }

  const seeds = search(db, searchOptions, queryEmbedding);

  if (seeds.length === 0) {
    return [];
  }

  const byNodeId = new Map<string, TraverseResult>();

  for (const seed of seeds) {
    byNodeId.set(seed.id, { node: seed, depth: 0 });
  }

  for (const seed of seeds) {
    const traverseOptions: TraverseOptions = { startId: seed.id };
    if (options.direction !== undefined) {
      traverseOptions.direction = options.direction;
    }
    if (options.maxDepth !== undefined) {
      traverseOptions.maxDepth = options.maxDepth;
    }
    if (options.edgeType !== undefined) {
      traverseOptions.edgeType = options.edgeType;
    }

    const neighbors = traverse(db, traverseOptions);

    for (const row of neighbors) {
      const existing = byNodeId.get(row.node.id);
      if (!existing || row.depth < existing.depth) {
        byNodeId.set(row.node.id, row);
      }
    }
  }

  return Array.from(byNodeId.values()).sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }

    return left.node.created_at - right.node.created_at;
  });
};

export const stats = (db: Database.Database): Stats => {
  const nodeTotal = db.prepare('SELECT COUNT(*) AS count FROM nodes').get() as { count: number };
  const invalidated = db
    .prepare('SELECT COUNT(*) AS count FROM nodes WHERE invalidated_at IS NOT NULL')
    .get() as { count: number };
  const nodeByTypeRows = db
    .prepare('SELECT type, COUNT(*) AS count FROM nodes GROUP BY type')
    .all() as Array<{
    type: string;
    count: number;
  }>;
  const edgeTotal = db.prepare('SELECT COUNT(*) AS count FROM edges').get() as { count: number };
  const edgeByTypeRows = db
    .prepare('SELECT type, COUNT(*) AS count FROM edges GROUP BY type')
    .all() as Array<{
    type: string;
    count: number;
  }>;

  const nodeByType: Record<string, number> = {};
  for (const row of nodeByTypeRows) {
    nodeByType[row.type] = row.count;
  }

  const edgeByType: Record<string, number> = {};
  for (const row of edgeByTypeRows) {
    edgeByType[row.type] = row.count;
  }

  return {
    nodes: {
      total: nodeTotal.count,
      byType: nodeByType,
      invalidated: invalidated.count,
    },
    edges: {
      total: edgeTotal.count,
      byType: edgeByType,
    },
  };
};
