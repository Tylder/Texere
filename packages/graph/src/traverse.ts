import type Database from 'better-sqlite3';

import {
  buildPaginatedResults,
  buildScope,
  clampPageLimit,
  parseGraphCursor,
} from './pagination.js';
import { search } from './search.js';
import type {
  AboutOptions,
  EdgeType,
  Node,
  PaginatedResults,
  SearchOptions,
  SearchResult,
  TraverseOptions,
} from './types.js';

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

interface AboutCandidate {
  row: TraverseResult;
  seedIndex: number;
}

const DEFAULT_MAX_DEPTH = 3;
const MAX_DEPTH_CAP = 5;
const INTERNAL_COLLECTION_LIMIT = 500;

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

const compareTraverseResults = (left: TraverseResult, right: TraverseResult): number => {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }

  if (left.node.created_at !== right.node.created_at) {
    return left.node.created_at - right.node.created_at;
  }

  return left.node.id.localeCompare(right.node.id);
};

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
        n.role,
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
        n.role,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at
      ORDER BY depth ASC, n.created_at ASC, n.id ASC
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
        n.role,
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
        n.role,
        n.title,
        n.content,
        n.tags_json,
        n.importance,
        n.confidence,
        n.created_at,
        n.invalidated_at
      ORDER BY depth ASC, n.created_at ASC, n.id ASC
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
      n.role,
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
      n.role,
      n.title,
      n.content,
      n.tags_json,
      n.importance,
      n.confidence,
      n.created_at,
      n.invalidated_at
    ORDER BY depth ASC, n.created_at ASC, n.id ASC
  `;
};

const buildTraverseScope = (options: TraverseOptions): string =>
  buildScope({
    endpoint: 'traverse',
    start_id: options.startId,
    direction: getDirection(options.direction),
    max_depth: toMaxDepth(options.maxDepth),
    edge_type: options.edgeType,
  });

const runTraverseRows = (db: Database.Database, options: TraverseOptions): TraverseRow[] => {
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
  return db.prepare(sql).all(params) as TraverseRow[];
};

const paginateTraverseResults = (
  results: TraverseResult[],
  limit: number,
  cursor: string | undefined,
  scope: string,
  mode?: 'keyword' | 'semantic' | 'hybrid',
): PaginatedResults<TraverseResult> => {
  const cursorValue = parseGraphCursor(cursor, scope);
  const filtered = cursorValue
    ? results.filter(
        (row) =>
          row.depth > cursorValue.depth ||
          (row.depth === cursorValue.depth && row.node.created_at > cursorValue.created_at) ||
          (row.depth === cursorValue.depth &&
            row.node.created_at === cursorValue.created_at &&
            row.node.id > cursorValue.id),
      )
    : results;

  return buildPaginatedResults(
    filtered,
    limit,
    'depth ASC, created_at ASC, id ASC',
    (row): TraverseResult => row,
    (row) => ({ depth: row.depth, created_at: row.node.created_at, id: row.node.id }),
    scope,
    mode,
  );
};

const collectAllSearchResults = async (
  db: Database.Database,
  options: SearchOptions,
  queryEmbedding?: Float32Array,
): Promise<SearchResult[]> => {
  const results: SearchResult[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = search(
      db,
      {
        ...options,
        limit: INTERNAL_COLLECTION_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
      queryEmbedding,
    );
    results.push(...page.results);

    if (!page.page.hasMore || !page.page.nextCursor) {
      return results;
    }

    cursor = page.page.nextCursor;
  }
};

const collectAllTraverseResults = (
  db: Database.Database,
  options: TraverseOptions,
): TraverseResult[] => toResults(runTraverseRows(db, options));

const buildAboutScope = (options: AboutOptions, mode: 'keyword' | 'semantic' | 'hybrid'): string =>
  buildScope({
    endpoint: 'about',
    query: options.query.trim(),
    mode,
    type: Array.isArray(options.type) ? [...options.type].sort() : options.type,
    role: options.role,
    tags: options.tags ? [...options.tags].sort() : undefined,
    tag_mode: options.tagMode ?? 'all',
    min_importance: options.minImportance,
    direction: getDirection(options.direction),
    max_depth: toMaxDepth(options.maxDepth),
    edge_type: options.edgeType,
  });

export const traverse = (
  db: Database.Database,
  options: TraverseOptions,
): PaginatedResults<TraverseResult> => {
  const rows = toResults(runTraverseRows(db, options));
  const limit = clampPageLimit(options.limit);
  const scope = buildTraverseScope(options);
  return paginateTraverseResults(rows, limit, options.cursor, scope);
};

export const about = async (
  db: Database.Database,
  options: AboutOptions,
  queryEmbedding?: Float32Array,
): Promise<PaginatedResults<TraverseResult>> => {
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
  if (options.tagMode !== undefined) {
    searchOptions.tagMode = options.tagMode;
  }
  if (options.role !== undefined) {
    searchOptions.role = options.role;
  }
  if (options.mode !== undefined) {
    searchOptions.mode = options.mode;
  }

  const seeds = await collectAllSearchResults(db, searchOptions, queryEmbedding);

  if (seeds.length === 0) {
    return {
      results: [],
      page: {
        nextCursor: null,
        hasMore: false,
        returned: 0,
        limit: clampPageLimit(options.limit),
        order: 'depth ASC, created_at ASC, id ASC',
      },
    };
  }

  const byNodeId = new Map<string, AboutCandidate>();

  for (const [seedIndex, seed] of seeds.entries()) {
    byNodeId.set(seed.id, { row: { node: seed, depth: 0 }, seedIndex });
  }

  for (const [seedIndex, seed] of seeds.entries()) {
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

    const neighbors = collectAllTraverseResults(db, traverseOptions);

    for (const row of neighbors) {
      const existing = byNodeId.get(row.node.id);
      if (!existing || row.depth < existing.row.depth) {
        byNodeId.set(row.node.id, { row, seedIndex });
        continue;
      }

      if (row.depth === existing.row.depth && seedIndex < existing.seedIndex) {
        byNodeId.set(row.node.id, { row, seedIndex });
      }
    }
  }

  const finalResults = Array.from(byNodeId.values())
    .sort((left, right) => {
      const resultComparison = compareTraverseResults(left.row, right.row);
      if (resultComparison !== 0) {
        return resultComparison;
      }
      return left.seedIndex - right.seedIndex;
    })
    .map((entry) => entry.row);

  const aboutMode = seeds[0]!.search_mode === 'auto' ? 'keyword' : seeds[0]!.search_mode;
  const limit = clampPageLimit(options.limit);
  const scope = buildAboutScope(options, aboutMode);
  return paginateTraverseResults(finalResults, limit, options.cursor, scope, aboutMode);
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
