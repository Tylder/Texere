import type Database from 'better-sqlite3';

import { sanitizeFtsQuery } from './sanitize.js';
import type { Node, SearchOptions } from './types.js';

type SearchRow = Node & { rank: number };

export const search = (db: Database.Database, options: SearchOptions): Node[] => {
  const query = sanitizeFtsQuery(options.query);
  if (query.length === 0) {
    return [];
  }

  const whereClauses = ['nodes_fts MATCH @query'];
  const params: Record<string, string | number> = {
    query,
    limit: options.limit ?? 20,
  };

  if (options.type) {
    whereClauses.push('n.type = @type');
    params['type'] = options.type;
  }

  if (options.minImportance !== undefined) {
    whereClauses.push('n.importance >= @minImportance');
    params['minImportance'] = options.minImportance;
  }

  const tags = options.tags?.filter((tag) => tag.length > 0) ?? [];
  const hasTagFilter = tags.length > 0;
  let tagFilterJoin = '';

  if (hasTagFilter) {
    const tagParams: string[] = [];

    tags.forEach((tag, index) => {
      const paramKey = `tag${index}`;
      params[paramKey] = tag;
      tagParams.push(`@${paramKey}`);
    });

    params['tagCount'] = tags.length;
    tagFilterJoin = `
      JOIN (
        SELECT node_id
        FROM node_tags
        WHERE tag IN (${tagParams.join(', ')})
        GROUP BY node_id
        HAVING COUNT(DISTINCT tag) = @tagCount
      ) tag_filter ON tag_filter.node_id = n.id
    `;
  }

  const sql = `
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
      n.embedding,
      bm25(nodes_fts, 10.0, 1.0, 3.0) AS rank
    FROM nodes_fts nf
    JOIN nodes n ON n.rowid = nf.rowid AND n.invalidated_at IS NULL
    ${tagFilterJoin}
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY rank ASC
    LIMIT @limit
  `;

  const rows = db.prepare(sql).all(params) as SearchRow[];
  return rows.map(({ rank: _rank, ...node }) => node);
};
