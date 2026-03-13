import type Database from 'better-sqlite3';

import {
  buildPaginatedResults,
  buildScope,
  clampPageLimit,
  parseCreatedCursor,
  parseHybridCursor,
  parseKeywordCursor,
  parseSemanticCursor,
  type SearchCreatedCursor,
} from './pagination.js';
import { sanitizeFtsQueryStrict } from './sanitize.js';
import type {
  Edge,
  Node,
  PaginatedResults,
  SearchMode,
  SearchOptions,
  SearchResult,
} from './types.js';

type RawKeywordRow = Node & { rank: number };
type RawSemanticRow = Node & { distance: number };
type HybridCandidate = Node & {
  score: number;
  match_fields: string[];
  search_mode: 'hybrid';
};

const RRF_K = 60;
const QUESTION_PREFIX_RE = /^(how|why|what|when)\b/i;

type ResolvedSearchMode = Exclude<SearchMode, 'auto'>;

const NODE_COLUMNS = `
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
`;

interface SearchContext {
  rawQuery: string;
  tags: string[];
  hasTagFilter: boolean;
  hasFtsQuery: boolean;
  requestedMode: ResolvedSearchMode;
  effectiveMode: ResolvedSearchMode;
  tagMode: 'all' | 'any';
  limit: number;
  whereClauses: string[];
  params: Record<string, string | number>;
  tagJoin: string;
  queryTerms: string[];
  semanticCandidateLimit: number;
  cursorScope: string;
  queryEmbedding?: Float32Array;
}

const extractTerms = (query: string): string[] =>
  query
    .replace(/["(){}[\]]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !['OR', 'AND', 'NOT', 'NEAR'].includes(t.toUpperCase()));

const detectMatchFields = (node: Node, terms: string[]): string[] => {
  if (terms.length === 0) return [];
  const fields: string[] = [];
  const lower = terms.map((t) => t.toLowerCase());
  if (lower.some((t) => node.title.toLowerCase().includes(t))) fields.push('title');
  if (lower.some((t) => node.content.toLowerCase().includes(t))) fields.push('content');
  if (lower.some((t) => node.tags_json.toLowerCase().includes(t))) fields.push('tags');
  if (node.role && lower.some((t) => String(node.role).toLowerCase().includes(t))) {
    fields.push('role');
  }
  return fields;
};

const normalizeRank = (rank: number): number => 1 / (1 + Math.abs(rank));

const normalizeSemanticDistance = (distance: number): number => 1 / (1 + distance);

const hasVectorRows = (db: Database.Database): boolean => {
  const row = db.prepare('SELECT COUNT(*) AS count FROM nodes_vec').get() as { count: number };
  return row.count > 0;
};

const getActiveNodeCount = (db: Database.Database): number => {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM nodes WHERE invalidated_at IS NULL')
    .get() as { count: number };
  return row.count;
};

export const detectSearchMode = (query: string): ResolvedSearchMode => {
  const trimmed = query.trim();
  const tokens = trimmed.length === 0 ? [] : trimmed.split(/\s+/);

  if (
    tokens.length >= 1 &&
    tokens.length <= 3 &&
    tokens.some((token) => /[A-Z]/.test(token) && token === token.toUpperCase())
  ) {
    return 'keyword';
  }

  if (QUESTION_PREFIX_RE.test(trimmed)) {
    return 'semantic';
  }

  if (tokens.length === 1) {
    return 'keyword';
  }

  return 'hybrid';
};

const resolveSearchMode = (options: SearchOptions): ResolvedSearchMode => {
  if (options.mode && options.mode !== 'auto') {
    return options.mode;
  }

  return detectSearchMode(options.query);
};

const buildTagJoin = (
  tags: string[],
  tagMode: 'all' | 'any',
  params: Record<string, string | number>,
): string => {
  const tagParams: string[] = [];
  tags.forEach((tag, index) => {
    const key = `tag${index}`;
    params[key] = tag;
    tagParams.push(`@${key}`);
  });

  if (tagMode === 'any') {
    return `
      JOIN (
        SELECT DISTINCT node_id
        FROM node_tags
        WHERE tag IN (${tagParams.join(', ')})
      ) tag_filter ON tag_filter.node_id = n.id`;
  }

  params['tagCount'] = tags.length;
  return `
    JOIN (
      SELECT node_id
      FROM node_tags
      WHERE tag IN (${tagParams.join(', ')})
      GROUP BY node_id
      HAVING COUNT(DISTINCT tag) = @tagCount
    ) tag_filter ON tag_filter.node_id = n.id`;
};

const buildTypeFilter = (
  type: SearchOptions['type'],
  params: Record<string, string | number>,
): string => {
  if (!type) return '';

  if (Array.isArray(type)) {
    if (type.length === 0) return '';
    const pieces: string[] = [];
    type.forEach((value, index) => {
      const key = `type${index}`;
      params[key] = value;
      pieces.push(`@${key}`);
    });
    return `n.type IN (${pieces.join(', ')})`;
  }

  params['type'] = type;
  return 'n.type = @type';
};

const getRelationships = (
  db: Database.Database,
  nodeIds: string[],
): Map<string, { incoming: Edge[]; outgoing: Edge[] }> => {
  const result = new Map<string, { incoming: Edge[]; outgoing: Edge[] }>();
  if (nodeIds.length === 0) return result;

  for (const id of nodeIds) {
    result.set(id, { incoming: [], outgoing: [] });
  }

  const placeholders = nodeIds.map((_, index) => `@id${index}`).join(', ');
  const idParams: Record<string, string> = {};
  nodeIds.forEach((id, index) => {
    idParams[`id${index}`] = id;
  });

  const sql = `
    SELECT id, source_id, target_id, type, created_at
    FROM edges
    WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
    ORDER BY created_at ASC, id ASC
  `;

  const edges = db.prepare(sql).all(idParams) as Edge[];

  for (const edge of edges) {
    const outBucket = result.get(edge.source_id);
    if (outBucket) outBucket.outgoing.push(edge);

    const inBucket = result.get(edge.target_id);
    if (inBucket) inBucket.incoming.push(edge);
  }

  return result;
};

const buildSearchContext = (
  db: Database.Database,
  options: SearchOptions,
  queryEmbedding?: Float32Array,
): SearchContext => {
  const rawQuery = options.query.trim();
  const tags = [...(options.tags?.filter((tag) => tag.length > 0) ?? [])].sort((a, b) =>
    a.localeCompare(b),
  );
  const hasTagFilter = tags.length > 0;
  const hasFtsQuery = rawQuery.length > 0;
  const requestedMode = resolveSearchMode(options);
  const effectiveMode =
    requestedMode === 'semantic' || requestedMode === 'hybrid'
      ? hasFtsQuery && queryEmbedding && hasVectorRows(db)
        ? requestedMode
        : 'keyword'
      : requestedMode;
  const tagMode = options.tagMode ?? 'all';
  const limit = clampPageLimit(options.limit);
  const params: Record<string, string | number> = {};
  const whereClauses: string[] = [];
  const typeFilter = buildTypeFilter(options.type, params);
  if (typeFilter) whereClauses.push(typeFilter);

  if (options.role !== undefined) {
    params['role'] = options.role;
    whereClauses.push('n.role = @role');
  }

  if (options.minImportance !== undefined) {
    params['minImportance'] = options.minImportance;
    whereClauses.push('n.importance >= @minImportance');
  }

  const tagJoin = hasTagFilter ? buildTagJoin(tags, tagMode, params) : '';
  const semanticCandidateLimit = Math.max(getActiveNodeCount(db), limit + 1);
  const cursorScope = buildScope({
    endpoint: 'search',
    query: rawQuery,
    mode: effectiveMode,
    type: Array.isArray(options.type) ? [...options.type].sort() : options.type,
    role: options.role,
    tags,
    tag_mode: tagMode,
    min_importance: options.minImportance,
  });

  return {
    rawQuery,
    tags,
    hasTagFilter,
    hasFtsQuery,
    requestedMode,
    effectiveMode,
    tagMode,
    limit,
    whereClauses,
    params,
    tagJoin,
    queryTerms: extractTerms(rawQuery),
    semanticCandidateLimit,
    cursorScope,
    ...(queryEmbedding ? { queryEmbedding } : {}),
  };
};

const runKeywordRows = (
  db: Database.Database,
  context: SearchContext,
  cursor: string | undefined,
  paginated: boolean,
): RawKeywordRow[] => {
  if (!context.hasFtsQuery) {
    return [];
  }

  const pageSize = paginated ? context.limit + 1 : context.semanticCandidateLimit;
  const params: Record<string, string | number> = { ...context.params, limit: pageSize };
  const cursorValue = paginated ? parseKeywordCursor(cursor, context.cursorScope) : null;
  const cursorClause = cursorValue
    ? 'AND (rank > @cursorRank OR (rank = @cursorRank AND id > @cursorId))'
    : '';

  if (cursorValue) {
    params['cursorRank'] = cursorValue.rank;
    params['cursorId'] = cursorValue.id;
  }

  const ftsWhere = ['nodes_fts MATCH @query', ...context.whereClauses];
  const sql = `
    SELECT *
    FROM (
      SELECT ${NODE_COLUMNS},
        bm25(nodes_fts, 10.0, 1.0, 3.0, 5.0) AS rank
      FROM nodes_fts nf
      JOIN nodes n ON n.rowid = nf.rowid AND n.invalidated_at IS NULL
      ${context.tagJoin}
      WHERE ${ftsWhere.join(' AND ')}
    ) ranked
    WHERE 1=1 ${cursorClause}
    ORDER BY rank ASC, id ASC
    LIMIT @limit
  `;

  const stmt = db.prepare(sql);

  try {
    return stmt.all({ ...params, query: context.rawQuery }) as RawKeywordRow[];
  } catch {
    const sanitized = sanitizeFtsQueryStrict(context.rawQuery);
    if (sanitized.length === 0) return [];
    return stmt.all({ ...params, query: sanitized }) as RawKeywordRow[];
  }
};

const runFilterRows = (
  db: Database.Database,
  context: SearchContext,
  cursor: string | undefined,
  paginated: boolean,
): RawKeywordRow[] => {
  const pageSize = paginated ? context.limit + 1 : context.semanticCandidateLimit;
  const params: Record<string, string | number> = { ...context.params, limit: pageSize };
  const cursorValue = paginated ? parseCreatedCursor(cursor, context.cursorScope) : null;
  const whereClauses = ['n.invalidated_at IS NULL', ...context.whereClauses];

  if (cursorValue) {
    params['cursorCreatedAt'] = cursorValue.created_at;
    params['cursorId'] = cursorValue.id;
    whereClauses.push(
      '(n.created_at < @cursorCreatedAt OR (n.created_at = @cursorCreatedAt AND n.id > @cursorId))',
    );
  }

  const sql = `
    SELECT ${NODE_COLUMNS},
      0 AS rank
    FROM nodes n
    ${context.tagJoin}
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY n.created_at DESC, n.id ASC
    LIMIT @limit
  `;

  return db.prepare(sql).all(params) as RawKeywordRow[];
};

const runSemanticRows = (
  db: Database.Database,
  context: SearchContext,
  cursor: string | undefined,
  paginated: boolean,
): RawSemanticRow[] => {
  if (!context.hasFtsQuery || !context.queryEmbedding || !hasVectorRows(db)) {
    return [];
  }

  const pageSize = paginated ? context.limit + 1 : context.semanticCandidateLimit;
  const params: Record<string, string | number> = {
    ...context.params,
    limit: pageSize,
    candidateLimit: context.semanticCandidateLimit,
  };
  const cursorValue = paginated ? parseSemanticCursor(cursor, context.cursorScope) : null;
  const embeddingBuffer = Buffer.from(
    context.queryEmbedding.buffer,
    context.queryEmbedding.byteOffset,
    context.queryEmbedding.byteLength,
  );
  const whereClauses = [...context.whereClauses];

  if (cursorValue) {
    params['cursorDistance'] = cursorValue.distance;
    params['cursorId'] = cursorValue.id;
    whereClauses.push(
      '(vm.distance > @cursorDistance OR (vm.distance = @cursorDistance AND n.id > @cursorId))',
    );
  }

  const semanticWhere = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
  const semanticSql = `
    WITH vec_matches AS (
      SELECT node_id, distance
      FROM nodes_vec
      WHERE embedding MATCH @queryEmbedding AND k = @candidateLimit
    )
    SELECT ${NODE_COLUMNS},
      vm.distance AS distance
    FROM vec_matches vm
    JOIN nodes n ON n.id = vm.node_id AND n.invalidated_at IS NULL
    ${context.tagJoin}
    WHERE ${semanticWhere}
    ORDER BY vm.distance ASC, n.id ASC
    LIMIT @limit
  `;

  return db.prepare(semanticSql).all({
    ...params,
    queryEmbedding: embeddingBuffer,
  }) as RawSemanticRow[];
};

const toKeywordResults = (
  db: Database.Database,
  rows: RawKeywordRow[],
  context: SearchContext,
  mode: 'keyword',
): PaginatedResults<SearchResult> => {
  const page = buildPaginatedResults(
    rows,
    context.limit,
    context.hasFtsQuery ? 'rank ASC, id ASC' : 'created_at DESC, id ASC',
    (row): SearchResult => row as SearchResult,
    (row) =>
      context.hasFtsQuery
        ? { rank: row.rank, id: row.id }
        : ({ created_at: row.created_at, id: row.id } satisfies SearchCreatedCursor),
    context.cursorScope,
    mode,
  );
  const relationships = getRelationships(
    db,
    page.results.map((row) => row.id),
  );

  return {
    results: page.results.map((row) => ({
      ...row,
      match_quality: normalizeRank(row.rank),
      search_mode: mode,
      match_fields: context.hasFtsQuery
        ? detectMatchFields(row, context.queryTerms)
        : context.hasTagFilter
          ? ['tags']
          : [],
      relationships: relationships.get(row.id) ?? { incoming: [], outgoing: [] },
    })),
    page: page.page,
  };
};

const toSemanticResults = (
  db: Database.Database,
  rows: RawSemanticRow[],
  context: SearchContext,
): PaginatedResults<SearchResult> => {
  const page = buildPaginatedResults(
    rows,
    context.limit,
    'distance ASC, id ASC',
    (row): SearchResult => ({
      ...row,
      rank: row.distance,
      match_quality: normalizeSemanticDistance(row.distance),
      match_fields: ['semantic'],
      search_mode: 'semantic',
      relationships: { incoming: [], outgoing: [] },
    }),
    (row) => ({ distance: row.distance, id: row.id }),
    context.cursorScope,
    'semantic',
  );
  const relationships = getRelationships(
    db,
    page.results.map((row) => row.id),
  );

  return {
    results: page.results.map((row) => ({
      ...row,
      relationships: relationships.get(row.id) ?? { incoming: [], outgoing: [] },
    })),
    page: page.page,
  };
};

const fuseHybridResults = (
  keywordRows: RawKeywordRow[],
  semanticRows: RawSemanticRow[],
  context: SearchContext,
): HybridCandidate[] => {
  const fused = new Map<string, HybridCandidate>();

  keywordRows.forEach((row, index) => {
    fused.set(row.id, {
      ...row,
      score: 1 / (RRF_K + index + 1),
      match_fields: detectMatchFields(row, context.queryTerms),
      search_mode: 'hybrid',
    });
  });

  semanticRows.forEach((row, index) => {
    const scoreDelta = 1 / (RRF_K + index + 1);
    const existing = fused.get(row.id);

    if (existing) {
      existing.score += scoreDelta;
      if (!existing.match_fields.includes('semantic')) {
        existing.match_fields.push('semantic');
      }
      return;
    }

    fused.set(row.id, {
      ...row,
      score: scoreDelta,
      match_fields: ['semantic'],
      search_mode: 'hybrid',
    });
  });

  return Array.from(fused.values()).sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    return left.id.localeCompare(right.id);
  });
};

const toHybridResults = (
  db: Database.Database,
  rows: HybridCandidate[],
  context: SearchContext,
): PaginatedResults<SearchResult> => {
  const cursor = parseHybridCursor(
    context.requestedMode === 'hybrid'
      ? (context.params['cursor'] as string | undefined)
      : undefined,
    context.cursorScope,
  );
  void cursor;
  const page = buildPaginatedResults(
    rows,
    context.limit,
    'score DESC, id ASC',
    (row): SearchResult => ({
      ...row,
      rank: row.score,
      match_quality: row.score,
      search_mode: 'hybrid',
      relationships: { incoming: [], outgoing: [] },
    }),
    (row) => ({ score: row.score, id: row.id }),
    context.cursorScope,
    'hybrid',
  );
  const relationships = getRelationships(
    db,
    page.results.map((row) => row.id),
  );

  return {
    results: page.results.map((row) => ({
      ...row,
      relationships: relationships.get(row.id) ?? { incoming: [], outgoing: [] },
    })),
    page: page.page,
  };
};

const paginateHybridCandidates = (
  rows: HybridCandidate[],
  cursor: string | undefined,
  context: SearchContext,
): HybridCandidate[] => {
  const cursorValue = parseHybridCursor(cursor, context.cursorScope);
  if (!cursorValue) {
    return rows.slice(0, context.limit + 1);
  }

  return rows
    .filter(
      (row) =>
        row.score < cursorValue.score ||
        (row.score === cursorValue.score && row.id > cursorValue.id),
    )
    .slice(0, context.limit + 1);
};

export const search = (
  db: Database.Database,
  options: SearchOptions,
  queryEmbedding?: Float32Array,
): PaginatedResults<SearchResult> => {
  const context = buildSearchContext(db, options, queryEmbedding);

  if (
    !context.hasFtsQuery &&
    !context.hasTagFilter &&
    !options.type &&
    options.minImportance === undefined &&
    !options.role
  ) {
    return {
      results: [],
      page: {
        nextCursor: null,
        hasMore: false,
        returned: 0,
        limit: context.limit,
        order: 'none',
        mode: context.effectiveMode,
      },
    };
  }

  if (context.effectiveMode === 'hybrid') {
    const keywordCandidates = runKeywordRows(db, context, undefined, false);
    const semanticCandidates = runSemanticRows(db, context, undefined, false);
    const fused = fuseHybridResults(keywordCandidates, semanticCandidates, context);
    const paged = paginateHybridCandidates(fused, options.cursor, context);
    return toHybridResults(db, paged, context);
  }

  if (context.effectiveMode === 'semantic') {
    const rows = runSemanticRows(db, context, options.cursor, true);
    return toSemanticResults(db, rows, context);
  }

  if (context.hasFtsQuery) {
    const rows = runKeywordRows(db, context, options.cursor, true);
    return toKeywordResults(db, rows, context, 'keyword');
  }

  const rows = runFilterRows(db, context, options.cursor, true);
  return toKeywordResults(db, rows, context, 'keyword');
};
