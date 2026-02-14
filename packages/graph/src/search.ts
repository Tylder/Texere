import type Database from 'better-sqlite3';

import { sanitizeFtsQueryStrict } from './sanitize.js';
import type { Edge, Node, SearchOptions, SearchResult } from './types.js';

type RawSearchRow = Node & { rank: number };

const NODE_COLUMNS = `
  n.id,
  n.type,
  n.role,
  n.title,
  n.content,
  n.tags_json,
  n.importance,
  n.confidence,
  n.status,
  n.scope,
  n.created_at,
  n.invalidated_at,
  n.embedding
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
    SELECT id, source_id, target_id, type, strength, confidence, created_at
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

export const search = (db: Database.Database, options: SearchOptions): SearchResult[] => {
  const rawQuery = options.query.trim();
  const tags = options.tags?.filter((t) => t.length > 0) ?? [];
  const hasTagFilter = tags.length > 0;
  const hasFtsQuery = rawQuery.length > 0;
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

  let rows: RawSearchRow[];

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
    match_fields: hasFtsQuery
      ? detectMatchFields(node as Node, queryTerms)
      : hasTagFilter
        ? ['tags']
        : [],
    relationships: relationships.get(node.id) ?? { incoming: [], outgoing: [] },
  }));
};
