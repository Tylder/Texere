import type { PaginatedResults, SearchMode } from './types.js';

export const DEFAULT_PAGE_LIMIT = 100;
export const GRAPH_MAX_PAGE_LIMIT = 500;

export interface CursorPayload<TLast> {
  scope: string;
  last: TLast;
}

export interface SearchKeywordCursor {
  rank: number;
  id: string;
}

export interface SearchSemanticCursor {
  distance: number;
  id: string;
}

export interface SearchCreatedCursor {
  created_at: number;
  id: string;
}

export interface SearchHybridCursor {
  score: number;
  id: string;
}

export interface GraphCursor {
  depth: number;
  created_at: number;
  id: string;
}

const toBase64Url = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

export const clampPageLimit = (limit: number | undefined): number => {
  if (limit === undefined) {
    return DEFAULT_PAGE_LIMIT;
  }

  return Math.min(GRAPH_MAX_PAGE_LIMIT, Math.max(1, Math.trunc(limit)));
};

export const encodeCursor = <TLast>(payload: CursorPayload<TLast>): string =>
  toBase64Url(JSON.stringify(payload));

export const decodeCursor = <TLast>(cursor: string): CursorPayload<TLast> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fromBase64Url(cursor));
  } catch {
    throw new Error('Invalid cursor');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid cursor');
  }

  const payload = parsed as Record<string, unknown>;

  if (
    typeof payload['scope'] !== 'string' ||
    typeof payload['last'] !== 'object' ||
    payload['last'] === null
  ) {
    throw new Error('Invalid cursor');
  }

  return {
    scope: payload['scope'],
    last: payload['last'] as TLast,
  };
};

export const assertCursorScope = (cursorScope: string, expectedScope: string): void => {
  if (cursorScope !== expectedScope) {
    throw new Error('Cursor does not match the current request');
  }
};

const compareValues = (left: number | string, right: number | string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

export const isAfterCursor = (
  values: Array<number | string>,
  cursorValues: Array<number | string>,
): boolean => {
  for (let index = 0; index < values.length; index += 1) {
    const comparison = compareValues(values[index]!, cursorValues[index]!);
    if (comparison > 0) return true;
    if (comparison < 0) return false;
  }

  return false;
};

export const isBeforeCursor = (
  values: Array<number | string>,
  cursorValues: Array<number | string>,
): boolean => {
  for (let index = 0; index < values.length; index += 1) {
    const comparison = compareValues(values[index]!, cursorValues[index]!);
    if (comparison < 0) return true;
    if (comparison > 0) return false;
  }

  return false;
};

export const buildPaginatedResults = <TRow, TResult, TLast>(
  rows: TRow[],
  limit: number,
  order: string,
  mapRow: (row: TRow) => TResult,
  getLast: (row: TRow) => TLast,
  scope: string,
  mode?: Exclude<SearchMode, 'auto'>,
): PaginatedResults<TResult> => {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    results: pageRows.map(mapRow),
    page: {
      nextCursor: hasMore && lastRow ? encodeCursor({ scope, last: getLast(lastRow) }) : null,
      hasMore,
      returned: pageRows.length,
      limit,
      order,
      ...(mode ? { mode } : {}),
    },
  };
};

const normalizeArray = (values: string[] | undefined): string[] | undefined => {
  if (!values || values.length === 0) {
    return undefined;
  }

  return [...values].sort((left, right) => left.localeCompare(right));
};

export const buildScope = (scope: Record<string, unknown>): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(scope)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, Array.isArray(value) ? normalizeArray(value) : value]),
    ),
  );

export const parseKeywordCursor = (
  cursor: string | undefined,
  scope: string,
): SearchKeywordCursor | null => {
  if (!cursor) return null;
  const payload = decodeCursor<SearchKeywordCursor>(cursor);
  assertCursorScope(payload.scope, scope);
  if (typeof payload.last.rank !== 'number' || typeof payload.last.id !== 'string') {
    throw new Error('Invalid cursor');
  }
  return payload.last;
};

export const parseSemanticCursor = (
  cursor: string | undefined,
  scope: string,
): SearchSemanticCursor | null => {
  if (!cursor) return null;
  const payload = decodeCursor<SearchSemanticCursor>(cursor);
  assertCursorScope(payload.scope, scope);
  if (typeof payload.last.distance !== 'number' || typeof payload.last.id !== 'string') {
    throw new Error('Invalid cursor');
  }
  return payload.last;
};

export const parseCreatedCursor = (
  cursor: string | undefined,
  scope: string,
): SearchCreatedCursor | null => {
  if (!cursor) return null;
  const payload = decodeCursor<SearchCreatedCursor>(cursor);
  assertCursorScope(payload.scope, scope);
  if (typeof payload.last.created_at !== 'number' || typeof payload.last.id !== 'string') {
    throw new Error('Invalid cursor');
  }
  return payload.last;
};

export const parseHybridCursor = (
  cursor: string | undefined,
  scope: string,
): SearchHybridCursor | null => {
  if (!cursor) return null;
  const payload = decodeCursor<SearchHybridCursor>(cursor);
  assertCursorScope(payload.scope, scope);
  if (typeof payload.last.score !== 'number' || typeof payload.last.id !== 'string') {
    throw new Error('Invalid cursor');
  }
  return payload.last;
};

export const parseGraphCursor = (cursor: string | undefined, scope: string): GraphCursor | null => {
  if (!cursor) return null;
  const payload = decodeCursor<GraphCursor>(cursor);
  assertCursorScope(payload.scope, scope);
  if (
    typeof payload.last.depth !== 'number' ||
    typeof payload.last.created_at !== 'number' ||
    typeof payload.last.id !== 'string'
  ) {
    throw new Error('Invalid cursor');
  }
  return payload.last;
};
