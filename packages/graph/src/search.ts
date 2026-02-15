import type Database from 'better-sqlite3';

import { sanitizeFtsQueryStrict } from './sanitize.js';
import type { Edge, Node, SearchMode, SearchOptions, SearchResult } from './types.js';

type RawSearchRow = Node & { rank: number };
type RawSemanticRow = Node & { distance: number };

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
  if (node.role && lower.some((t) => String(node.role).toLowerCase().includes(t)))
    fields.push('role');
  return fields;
};

const normalizeRank = (rank: number): number => 1 / (1 + Math.abs(rank));

const normalizeDistance = (distance: number, minDistance: number, maxDistance: number): number => {
  if (maxDistance <= minDistance) return 1;
  const normalized = (distance - minDistance) / (maxDistance - minDistance);
  return Math.max(0, Math.min(1, 1 - normalized));
};

const hasVectorRows = (db: Database.Database): boolean => {
  const row = db.prepare('SELECT COUNT(*) AS count FROM nodes_vec').get() as { count: number };
  return row.count > 0;
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

const fuseHybridResults = (
  keywordResults: SearchResult[],
  semanticResults: SearchResult[],
  limit: number,
): SearchResult[] => {
  const fused = new Map<
    string,
    {
      base: SearchResult;
      score: number;
      fields: Set<string>;
    }
  >();

  keywordResults.forEach((result, index) => {
    fused.set(result.id, {
      base: result,
      score: 1 / (RRF_K + index + 1),
      fields: new Set(result.match_fields),
    });
  });

  semanticResults.forEach((result, index) => {
    const existing = fused.get(result.id);
    const scoreDelta = 1 / (RRF_K + index + 1);

    if (existing) {
      existing.score += scoreDelta;
      existing.fields.add('semantic');
      return;
    }

    fused.set(result.id, {
      base: result,
      score: scoreDelta,
      fields: new Set(['semantic']),
    });
  });

  return Array.from(fused.values())
    .map(({ base, score, fields }) => ({
      ...base,
      rank: score,
      match_quality: score,
      match_fields: Array.from(fields),
      search_mode: 'hybrid' as const,
    }))
    .sort((left, right) => right.match_quality - left.match_quality)
    .slice(0, limit);
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
    type.forEach((t, i) => {
      const key = `type${i}`;
      params[key] = t;
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

  const placeholders = nodeIds.map((_, i) => `@id${i}`).join(', ');
  const idParams: Record<string, string> = {};
  nodeIds.forEach((id, i) => {
    idParams[`id${i}`] = id;
  });

  const sql = `
    SELECT id, source_id, target_id, type, created_at
    FROM edges
    WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
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


export const search = (
  db: Database.Database,
  options: SearchOptions,
  queryEmbedding?: Float32Array,
): SearchResult[] => {
  const rawQuery = options.query.trim();
  const tags = options.tags?.filter((t) => t.length > 0) ?? [];
  const hasTagFilter = tags.length > 0;
  const hasFtsQuery = rawQuery.length > 0;
  const mode = resolveSearchMode(options);
  const tagMode = options.tagMode ?? 'all';
  const limit = options.limit ?? 20;

  // No query and no filters → empty result
  if (
    !hasFtsQuery &&
    !hasTagFilter &&
    !options.type &&
    options.minImportance === undefined &&
    !options.role
  ) {
    return [];
  }

  const params: Record<string, string | number> = { limit };
  const whereClauses: string[] = [];
  const tagJoin = hasTagFilter ? buildTagJoin(tags, tagMode, params) : '';

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

  if (mode === 'hybrid') {
    const keywordResults = search(db, { ...options, mode: 'keyword' }, queryEmbedding);

    if (!hasFtsQuery || !queryEmbedding || !hasVectorRows(db)) {
      return keywordResults;
    }

    const semanticResults = search(db, { ...options, mode: 'semantic' }, queryEmbedding);
    return fuseHybridResults(keywordResults, semanticResults, limit);
  }

  let rows: RawSearchRow[];

  if (mode === 'semantic' && hasFtsQuery && queryEmbedding && hasVectorRows(db)) {
    const semanticWhere = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
    const embeddingBuffer = Buffer.from(
      queryEmbedding.buffer,
      queryEmbedding.byteOffset,
      queryEmbedding.byteLength,
    );

    const semanticSql = `
      WITH vec_matches AS (
        SELECT node_id, distance
        FROM nodes_vec
        WHERE embedding MATCH @queryEmbedding AND k = @limit
      )
      SELECT ${NODE_COLUMNS},
        vm.distance AS distance
      FROM vec_matches vm
      JOIN nodes n ON n.id = vm.node_id AND n.invalidated_at IS NULL
      ${tagJoin}
      WHERE ${semanticWhere}
      ORDER BY vm.distance ASC
      LIMIT @limit
    `;

    const semanticRows = db.prepare(semanticSql).all({
      ...params,
      queryEmbedding: embeddingBuffer,
    }) as RawSemanticRow[];

    if (semanticRows.length === 0) return [];

    const nodeIds = semanticRows.map((row) => row.id);
    const relationships = getRelationships(db, nodeIds);
    const distances = semanticRows.map((row) => row.distance);
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);

    return semanticRows.map(({ distance, ...node }) => ({
      ...node,
      rank: distance,
      match_quality: normalizeDistance(distance, minDistance, maxDistance),
      match_fields: ['semantic'],
      search_mode: 'semantic',
      relationships: relationships.get(node.id) ?? { incoming: [], outgoing: [] },
    }));
  }

  if (hasFtsQuery) {
    // FTS path: BM25 weights = title 10.0, content 1.0, tags 3.0, role 5.0
    const ftsWhere = ['nodes_fts MATCH @query', ...whereClauses];
    const sql = `
      SELECT ${NODE_COLUMNS},
        bm25(nodes_fts, 10.0, 1.0, 3.0, 5.0) AS rank
      FROM nodes_fts nf
      JOIN nodes n ON n.rowid = nf.rowid AND n.invalidated_at IS NULL
      ${tagJoin}
      WHERE ${ftsWhere.join(' AND ')}
      ORDER BY rank ASC
      LIMIT @limit
    `;

    const stmt = db.prepare(sql);

    // Try raw query first (supports phrases, boolean OR/AND)
    // Fall back to strict sanitizer on FTS5 syntax error
    try {
      rows = stmt.all({ ...params, query: rawQuery }) as RawSearchRow[];
    } catch {
      const sanitized = sanitizeFtsQueryStrict(rawQuery);
      if (sanitized.length === 0) return [];
      rows = stmt.all({ ...params, query: sanitized }) as RawSearchRow[];
    }
  } else {
    // Non-FTS path: tag-only or filter-only search
    whereClauses.unshift('n.invalidated_at IS NULL');
    const sql = `
      SELECT ${NODE_COLUMNS},
        0 AS rank
      FROM nodes n
      ${tagJoin}
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY n.created_at DESC
      LIMIT @limit
    `;

    rows = db.prepare(sql).all(params) as RawSearchRow[];
  }

  if (rows.length === 0) return [];

  // Relationship aggregation: single query for all result nodes
  const nodeIds = rows.map((r) => r.id);
  const relationships = getRelationships(db, nodeIds);

  // Detect which FTS5 columns matched
  const queryTerms = extractTerms(rawQuery);

  return rows.map(({ rank, ...node }) => ({
    ...node,
    rank,
    match_quality: normalizeRank(rank),
    search_mode: 'keyword',
    match_fields: hasFtsQuery
      ? detectMatchFields(node as Node, queryTerms)
      : hasTagFilter
        ? ['tags']
        : [],
    relationships: relationships.get(node.id) ?? { incoming: [], outgoing: [] },
  }));
};
